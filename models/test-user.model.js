const mongoose = require('mongoose');

const testUserSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: true,
      },
      email: {
         type: String,
         required: true,
         unique: true,
      },
      url: {
         type: String,
         required: false,
      },
      password: {
         type: String,
         required: true,
      },
   },
   {
      timestamps: true,
   }
);

const TestUser = mongoose.model('TestUser', testUserSchema);

module.exports = TestUser;