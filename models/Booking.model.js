const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const bookingSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: [true, "Tutor ID is required"],
    },
    tutorName: {
      type: String,
      required: [true, "Tutor name is required"],
      trim: true,
      // auto-filled from tutor document
    },
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      // auto-filled from auth session
    },
    studentEmail: {
      type: String,
      required: [true, "Student email is required"],
      lowercase: true,
      trim: true,
      // auto-filled from auth session
    },
    studentPhone: {
      type: String,
      required: [true, "Student phone number is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    sessionToken: {
      type: String,
      unique: true,
      default: () => uuidv4(), // auto-generated on every new booking
    },
  },
  {
    timestamps: true, // auto adds createdAt (used as bookedAt) and updatedAt
  }
);

// Index for fast lookup of a user's own bookings
bookingSchema.index({ studentEmail: 1 });

// Index for fast lookup of bookings by tutor
bookingSchema.index({ tutorId: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;