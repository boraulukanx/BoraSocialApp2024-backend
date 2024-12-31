const mongoose = require("mongoose");
const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    subtype: { type: String, default: null }, // Add subtype field
    description: { type: String, required: true }, // Add description field
    location: { type: String, required: true },
    entryFee: { type: Number, default: 0 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    maxParticipants: { type: Number, required: true },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    locationLAT: { type: Number, default: null, required: true }, // Latitude
    locationLNG: { type: Number, default: null, required: true }, // Longitude
  },
  { timestamps: true }
);
module.exports = mongoose.model("Event", EventSchema);
