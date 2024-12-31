const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, min: 3, max: 20, unique: true },
    email: { type: String, required: true, max: 40, unique: true },
    password: { type: String, min: 6, required: true },
    profilePicture: { type: String, default: "" },
    followers: { type: [String], default: [] },
    following: { type: [String], default: [] },
    locationLAT: { type: Number, default: 0 }, // Latitude
    locationLNG: { type: Number, default: 0 }, // Longitude
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", UserSchema);
