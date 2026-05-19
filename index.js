// install dotenv and then add this line to use .env file variable in code
require('dotenv').config();

const express = require('express')
const app = express()
const port = process.env.PORT || 5000

const mongoose = require('mongoose');

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
})
