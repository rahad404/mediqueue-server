// install dotenv and then add this line to use .env file variable in code
require('dotenv').config();

const express = require('express')
const app = express()
const port = process.env.PORT || 5000
app.use(express.json()) // for parsing application/json

const mongoose = require('mongoose');
const TestUser = require('./models/test-user.model');

// mongodb connection
mongoose.connect(process.env.MONGODB_URI)
   .then(() => {
      console.log('Connected to MongoDB');

      // Start the server after successful connection to MongoDB
      // but we could add it before the connection as well, it will work either way 
      app.listen(port, () => {
         console.log(`Example app listening on port ${port}`)
      })
   })
   .catch((e) => {
      console.error('Error connecting to MongoDB', e);
   });


app.get('/', (req, res) => {
   res.send('express server is running!')
});

// test user creation route
app.post('/test-user', async (req, res) => {
   try {
      const testUser = await TestUser.create(req.body);
      console.log(testUser);
      res.status(200).json(testUser);
   }
   catch (e){
      console.error('Error creating test user', e);
      res.status(500).send('Error creating test user');
   }
});

// get all test user api
app.get("/test-user", async (req, res) =>{
   try{
      const testUsers = await TestUser.find();
      res.status(200).json(testUsers);
   }
   catch(e){
      console.error('Error getting all test user', e);
      res.status(500).send('Error getting all test user');
   }
});

// get tesst user by id api
app.get("/test-user/:id", async (req, res) =>{
   try{
      const {id} = req.params;
      const testUser = await TestUser.findById(id);
      res.status(200).json(testUser);
   }
   catch(e){
      console.error('Error finding test user by id', e);
      res.status(500).send('Error finding test user by id');
   }
});


// update test user by id api
app.put("/test-user/:id", async (req, res) =>{
   try{
      const {id} = req.params;
      const testUser = await TestUser.findByIdAndUpdate(id, req.body);

      if(!testUser){
         return res.status(404).send({message: "test user not found"});
      }

      const updatedtestUser = await TestUser.findById(id);
      res.status(200).json(updatedtestUser);
   }
   catch(e){
      console.error('Error updating test user', e);
      res.status(500).send('Error updating test user');
   }
});

