require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const app = express();

// middleware
app.use(cors());
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
    const { payload } = await jwtVerify(token, JWKS)
    // console.log(payload)
    next()
  }
  catch (error) {
    console.error(error)
    return res.status(401).json({ message: "unauthorized" })
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
    // Update user: /users/:id
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
          return res
            .status(400)
            .send({ message: "No valid fields provided to update" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: fields };
        const result = await userCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ success: true, message: "Profile updated successfully" });
      }
      catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // ----------------------------- TUTOR ROUTES -----------------------------

    // POST: /tutors — Create a new tutor
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

    //filter tutor by search query
    app.get("/tutors", async (req, res) => {
      try {
        const { search, startDate, endDate, limit } = req.query;

        // build conditions array to combine search + date-range cleanly
        const conditions = [];

        // Search tutor name or other feild (case-insensitive)
        if (search?.trim()) {
          const q = search.trim();

          // text regex for common text fields
          const textRegex = { $regex: q, $options: "i" };

          // if the query looks like a number, include numeric matches
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
              // numeric fields (exact match)
              ...(num !== null
                ? [{ hourlyFee: num }, { totalSlots: num }]
                : []),
            ],
          });
        }

        // Date range
        if (startDate || endDate) {
          // parse and validate
          let sd, ed;
          if (startDate) {
            sd = new Date(startDate);
            if (isNaN(sd))
              return res.status(400).json({ message: "Invalid startDate" });
            if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.startDate))
              sd.setHours(0, 0, 0, 0);
          }
          if (endDate) {
            ed = new Date(endDate);
            if (isNaN(ed))
              return res.status(400).json({ message: "Invalid endDate" });
            if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.endDate))
              ed.setHours(23, 59, 59, 999);
          }

          // build range objects
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

          // support both BSON Date (actual Date) and ISO string stored values
          const rangeCondition = {
            $or: [
              { sessionStartDate: dateRange }, // when field is stored as Date
              { sessionStartDate: stringRange }, // when field is stored as ISO string
            ],
          };

          conditions.push(rangeCondition);
        }

        // final query
        const finalQuery = conditions.length ? { $and: conditions } : {};

        let cursor = tutorCollection.find(finalQuery).sort({ _id: -1 });

        // to get limited tutor
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

    // GET: /tutors/user/:email — Get all tutors added by a specific user (My Tutors page)
    app.get("/tutors/user/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        const tutors = await tutorCollection
          .find({ createdBy: email })
          .sort({ _id: -1 })
          .toArray();
        res.status(200).json(tutors);
      } catch (error) {
        console.error("Error fetching user tutors:", error);
        res.status(500).json({ message: "Failed to fetch your tutors." });
      }
    });

    // GET /tutors/:id — Get a single tutor by MongoDB ObjectId
    app.get("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tutor = await tutorCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!tutor) {
          return res.status(404).json({ message: "Tutor not found." });
        }
        res.status(200).json(tutor);
      } catch (error) {
        console.error("Error fetching tutor:", error);
        res.status(500).json({ message: "Failed to fetch tutor." });
      }
    });

    //Patch: tutors/:id  update tutor feield
    app.patch("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        delete updates._id;

        const result = await tutorCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" }
        );

        if (!result) {
          return res.status(404).json({ message: "Tutor profile not found." });
        }

        res.status(200).json({
          message: "Tutor updated successfully.",
          tutor: result
        });
      } catch (error) {
        console.error("Error updating tutor:", error);
        res.status(500).json({ message: "Failed to update tutor." });
      }
    });

    // Delete tutor: /tutor/:id
    app.delete("/tutors/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const result = await tutorCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Tutor not found." });
        }
        res.status(200).json({ message: "Tutor deleted successfully." });
      } catch (error) {
        console.error("Error deleting tutor:", error);
        res.status(500).json({ message: "Failed to delete tutor." });
      }
    });

    // ------------------ Bookings routs -------------------
    // Get all bookings
    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        const bookings = await bookingCollection.find().toArray();
        res.status(200).json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Failed to fetch bookings." });
      }
    });

    // get all booking by login user email
    app.get("/bookings/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        const bookings = await bookingCollection
          .find({ studentEmail: email })
          .toArray();
        res.status(200).json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Failed to fetch bookings." });
      }
    });

    // create booking
    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const { tutorId, tutorName, studentName, studentEmail, studentPhone } =
          req.body;
        const tutor = await tutorCollection.findOne({
          _id: new ObjectId(tutorId),
        });
        if (!tutor) {
          return res
            .status(404)
            .json({ message: "Requested instructor profile does not exist." });
        }

        // check available slot
        const totalSlotsLeft = Number(tutor.totalSlots || 0);
        if (totalSlotsLeft <= 0) {
          return res.status(400).json({
            message:
              "This session is fully booked. You can't join at the moment. No available slots left.",
          });
        }

        // check start day over or not
        if (tutor.sessionStartDate) {
          const currentDate = new Date();
          const sessionDate = new Date(tutor.sessionStartDate);

          // reject if the session has already started/passed
          if (currentDate > sessionDate) {
            return res.status(400).json({
              message: "Booking is no longer available for this tutor.",
            });
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

        await tutorCollection.updateOne(
          { _id: new ObjectId(tutorId) },
          { $inc: { totalSlots: -1 } },
        );

        res.status(201).json({
          success: true,
          message: "Booking confirmed successfully, space allocated.",
          bookingId: bookingResult.insertedId,
        });
      } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ message: "Failed to create booking." });
      }
    });

    // update booking status api route
    app.patch("/bookings/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { bookingStatus } = req.body;

        const booking = await bookingCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!booking) {
          return res.status(404).json({ message: "Booking not found." });
        }

        const result = await bookingCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { bookingStatus } },
        );

        // If the student is cancelling, give the slot back to the tutor
        if (bookingStatus === "cancelled") {
          await tutorCollection.updateOne(
            { _id: new ObjectId(booking.tutorId) },
            { $inc: { totalSlots: 1 } },
          );
        }

        res
          .status(200)
          .json({ message: "Booking status updated successfully." });
      } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({ message: "Failed to update booking status." });
      }
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

run().catch(console.dir);

// Start the Express server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
