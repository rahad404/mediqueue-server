require('dotenv').config();

const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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

      
      //---------------- tutor api endpoints ----------------
      
      // create a tutor
      app.post("/tutors", async (req, res) => {
         const tutor = req.body;
         const result = await tutorCollection.insertOne(tutor);
         console.log(result);

         res.status(201).json(result);
      });

      // get all tutors
      app.get("tutors", async (req, res) => {
         const tutors = await tutorCollection.find().toArray();
         console.log(tutors);

         res.status(200).json(tutors);
      });

      //get a tutor by id
      app.get("tutors/:id", async (req, res) => {
         const { id } = req.params;
         const tutor = await tutorCollection.findOne({ _id: new ObjectId(id)});
         console.log(tutor);
         
         res.status(200).json(tutor);
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