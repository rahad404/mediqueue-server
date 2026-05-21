require('dotenv').config();

const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express()

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 5000
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});


async function run() {
   try {
      await client.connect();
      console.log("Connected successfully to MongoDB!");

      const db = client.db('mediqueue');
      const tutorCollection = db.collection('tutors');
      const bookingCollection = db.collection('bookings');

      app.get('/', (req, res) => {
         res.send('express server is running!')
      });

      // create a tutor
      app.post("/tutors", async (req, res) => {
         const tutor = req.body;
         const result = await tutorCollection.insertOne(tutor)
      })
   }
   catch (error) {
      console.error("Database connection failed:", error);
   }
}
run().catch(console.dir);


// Start the Express server
app.listen(port, () => {
   console.log(`App listening on port ${port}`)
})