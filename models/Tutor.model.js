const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    tutorName: {
      type: String,
      required: [true, "Tutor name is required"],
      trim: true,
    },
    photo: {
      type: String,
      required: [true, "Photo URL is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      enum: [
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "English",
        "Bangla",
        "History",
        "Geography",
        "ICT",
        "Accounting",
        "Economics",
        "Other",
      ],
    },
    availableDays: {
      type: String,
      required: [true, "Available days are required"],
      trim: true,
      // e.g. "Sun - Thu"
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      trim: true,
      // e.g. "5:00 PM - 8:00 PM"
    },
    hourlyFee: {
      type: Number,
      required: [true, "Hourly fee is required"],
      min: [0, "Hourly fee cannot be negative"],
    },
    totalSlot: {
      type: Number,
      required: [true, "Total slot count is required"],
      min: [0, "Total slots cannot be negative"],
    },
    sessionStartDate: {
      type: Date,
      required: [true, "Session start date is required"],
    },
    institution: {
      type: String,
      required: [true, "Institution is required"],
      trim: true,
    },
    experience: {
      type: String,
      required: [true, "Experience is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      // e.g. "Dhanmondi, Dhaka"
    },
    teachingMode: {
      type: String,
      required: [true, "Teaching mode is required"],
      enum: ["Online", "Offline", "Both"],
    },
    createdBy: {
      type: String,
      required: [true, "Creator email is required"],
      // stores the logged-in user's email
    },
    createdByUid: {
      type: String,
      required: [true, "Creator user ID is required"],

    },
  },
  {
    timestamps: true, 
  }
);

// Index for case-insensitive search on tutorName & date-range filtering on sessionStartDate
tutorSchema.index({ tutorName: "text" });
tutorSchema.index({ sessionStartDate: 1 });

const Tutor = mongoose.model("Tutor", tutorSchema);

module.exports = Tutor;