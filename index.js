require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB!");

    const db = client.db("mediqueue");
    const tutorCollection = db.collection("tutors");
    const bookingCollection = db.collection("bookings");

    app.get("/", (req, res) => {
      res.send("express server is running!");
    });

    // ----------------------------- TUTOR ROUTES -----------------------------

    // POST: /tutors — Create a new tutor
    app.post("/tutors", async (req, res) => {
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
        const query = {};

        // Search tutor name
        if (search?.trim()) {
          query.tutorName = { $regex: search.trim(), $options: "i",};
        }

        // Date range
        if (startDate || endDate) {
          query.sessionDate = {};
          if (startDate) { query.sessionDate.$gte = new Date(`${startDate}T00:00:00.000Z`); }
          if (endDate) { query.sessionDate.$lte = new Date(`${endDate}T23:59:59.999Z`); }
        }

        let cursor = tutorCollection.find(query);

        // to get limited tutor
        if (limit) {
          cursor = cursor.limit(Number(limit));
        }

        const tutors = await cursor.toArray();

        res.status(200).json(tutors);
      } catch (error) {
        console.error("Error fetching tutors:", error);

        res.status(500).json({
          message: "Failed to fetch tutors.",
        });
      }
    });

    // GET: /tutors/user/:email — Get all tutors added by a specific user (My Tutors page)
    // NOTE: this route must be defined BEFORE /tutors/:id so ":id" doesn't swallow "user"
    app.get("/tutors/user/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const tutors = await tutorCollection
          .find({ userEmail: email })
          .toArray();
        res.status(200).json(tutors);
      } catch (error) {
        console.error("Error fetching user tutors:", error);
        res.status(500).json({ message: "Failed to fetch your tutors." });
      }
    });

    // GET /tutors/:id — Get a single tutor by MongoDB ObjectId
    app.get("/tutors/:id", async (req, res) => {
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
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

run().catch(console.dir);

// Start the Express server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
