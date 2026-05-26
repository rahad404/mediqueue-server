require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const app = express();

// middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// jwt validation
const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

// middleware to verify token
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload; // Good practice: attach payload to req for route usage
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "unauthorized" });
  }
};

async function run() {
  try {
    // await client.connect();
    // console.log("Connected successfully to MongoDB!");

    const db = client.db("mediqueue");
    const tutorCollection = db.collection("tutors");
    const bookingCollection = db.collection("bookings");
    const userCollection = db.collection("user");

    app.get("/", (req, res) => {
      res.send("express server is running!");
    });

    // ----------------------------- USER ROUTES -----------------------------
    // update user
    app.patch("/users/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { name, image } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid user ID" });
        }

        const fields = {};
        if (name !== undefined && name !== "") fields.name = name;
        if (image !== undefined && image !== "") fields.image = image;

        if (Object.keys(fields).length === 0) {
          return res.status(400).send({ message: "No valid fields provided to update" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: fields };
        const result = await userCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, message: "Profile updated successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ----------------------------- TUTOR ROUTES -----------------------------
    // create tutor
    app.post("/tutors", verifyToken, async (req, res) => {
      try {
        const tutor = req.body;
        const result = await tutorCollection.insertOne(tutor);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error creating tutor:", error);
        res.status(500).json({ message: "Failed to create tutor." });
      }
    });

    // get tutors
    app.get("/tutors", async (req, res) => {
      try {
        const { search, startDate, endDate, limit } = req.query;
        const conditions = [];

        if (search?.trim()) {
          const q = search.trim();
          const textRegex = { $regex: q, $options: "i" };
          const num = !isNaN(Number(q)) ? Number(q) : null;

          conditions.push({
            $or: [
              { tutorName: textRegex },
              { subject: textRegex },
              { location: textRegex },
              { teachingMode: textRegex },
              { institution: textRegex },
              { experience: textRegex },
              { availableDays: textRegex },
              { availableTime: textRegex },
              ...(num !== null ? [{ hourlyFee: num }, { totalSlots: num }] : []),
            ],
          });
        }

        if (startDate || endDate) {
          let sd, ed;
          if (startDate) {
            sd = new Date(startDate);
            if (isNaN(sd.getTime())) return res.status(400).json({ message: "Invalid startDate" });
            if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) sd.setHours(0, 0, 0, 0);
          }
          if (endDate) {
            ed = new Date(endDate);
            if (isNaN(ed.getTime())) return res.status(400).json({ message: "Invalid endDate" });
            if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ed.setHours(23, 59, 59, 999);
          }

          const dateRange = {};
          const stringRange = {};
          if (sd) {
            dateRange.$gte = sd;
            stringRange.$gte = sd.toISOString();
          }
          if (ed) {
            dateRange.$lte = ed;
            stringRange.$lte = ed.toISOString();
          }

          conditions.push({
            $or: [
              { sessionStartDate: dateRange },
              { sessionStartDate: stringRange },
            ],
          });
        }

        const finalQuery = conditions.length ? { $and: conditions } : {};
        let cursor = tutorCollection.find(finalQuery).sort({ _id: -1 });

        if (limit) {
          cursor = cursor.limit(Number(limit));
        }

        const tutors = await cursor.toArray();
        res.status(200).json(tutors);
      } catch (error) {
        console.error("Error fetching tutors:", error);
        res.status(500).json({ message: "Failed to fetch tutors." });
      }
    });

    // get tutor by creator email
    app.get("/tutors/user/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        const tutors = await tutorCollection.find({ createdBy: email }).sort({ _id: -1 }).toArray();
        res.status(200).json(tutors);
      } catch (error) {
        console.error("Error fetching user tutors:", error);
        res.status(500).json({ message: "Failed to fetch your tutors." });
      }
    });

    // get tutor by id
    app.get("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID format" });

        const tutor = await tutorCollection.findOne({ _id: new ObjectId(id) });
        if (!tutor) return res.status(404).json({ message: "Tutor not found." });

        res.status(200).json(tutor);
      } catch (error) {
        console.error("Error fetching tutor:", error);
        res.status(500).json({ message: "Failed to fetch tutor." });
      }
    });

    // update tutor by id
    app.patch("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID format" });

        const updates = req.body;
        delete updates._id;

        const result = await tutorCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" }
        );

        if (!result) return res.status(404).json({ message: "Tutor profile not found." });

        res.status(200).json({ message: "Tutor updated successfully.", tutor: result });
      } catch (error) {
        console.error("Error updating tutor:", error);
        res.status(500).json({ message: "Failed to update tutor." });
      }
    });

    // delete tutor by id
    app.delete("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid ID format" });

        const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Tutor not found." });

        res.status(200).json({ message: "Tutor deleted successfully." });
      } catch (error) {
        console.error("Error deleting tutor:", error);
        res.status(500).json({ message: "Failed to delete tutor." });
      }
    });

    // ------------------ BOOKINGS ROUTES -------------------
    // get all bookings
    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        const bookings = await bookingCollection.find().toArray();
        res.status(200).json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Failed to fetch bookings." });
      }
    });

    // get bookings by student email
    app.get("/bookings/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        const bookings = await bookingCollection.find({ studentEmail: email }).toArray();
        res.status(200).json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Failed to fetch bookings." });
      }
    });

    // create booking
    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const { tutorId, tutorName, studentName, studentEmail, studentPhone } = req.body;
        if (!ObjectId.isValid(tutorId)) return res.status(400).json({ message: "Invalid Tutor ID" });

        const tutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });
        if (!tutor) return res.status(404).json({ message: "Requested instructor profile does not exist." });

        const totalSlotsLeft = Number(tutor.totalSlots || 0);
        if (totalSlotsLeft <= 0) {
          return res.status(400).json({ message: "This session is fully booked." });
        }

        if (tutor.sessionStartDate) {
          const currentDate = new Date();
          const sessionDate = new Date(tutor.sessionStartDate);
          if (currentDate > sessionDate) {
            return res.status(400).json({ message: "Booking is no longer available for this tutor." });
          }
        }

        const newBooking = {
          tutorId: new ObjectId(tutorId),
          tutorName,
          studentName,
          studentEmail,
          studentPhone,
          bookingStatus: "Review Pending",
          createdAt: new Date(),
        };

        const bookingResult = await bookingCollection.insertOne(newBooking);
        await tutorCollection.updateOne({ _id: new ObjectId(tutorId) }, { $inc: { totalSlots: -1 } });

        res.status(201).json({
          success: true,
          message: "Booking confirmed successfully.",
          bookingId: bookingResult.insertedId,
        });
      } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Failed to create booking." });
      }
    });

    // update booking by id
    app.patch("/bookings/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { bookingStatus } = req.body;
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid Booking ID" });

        const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) return res.status(404).json({ message: "Booking not found." });
        if (booking.bookingStatus === "cancelled") {
          return res.status(400).json({ message: "This session is already cancelled." });
        }

        await bookingCollection.updateOne({ _id: new ObjectId(id) }, { $set: { bookingStatus } });

        if (bookingStatus === "cancelled" && booking.tutorId) {
          const tId = typeof booking.tutorId === "string" ? new ObjectId(booking.tutorId) : booking.tutorId;
          await tutorCollection.updateOne({ _id: tId }, { $inc: { totalSlots: 1 } });
        }

        return res.status(200).json({
          message: "Booking status updated successfully.",
          bookingStatus: "cancelled",
        });
      } catch (error) {
        console.error("Error updating booking:", error);
        return res.status(500).json({ message: "Failed to update booking status." });
      }
    });

    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });

  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

run().catch(console.dir);
