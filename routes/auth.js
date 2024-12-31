const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register
// routes/auth.js
router.post("/register", async (req, res) => {
  const {
    username,
    email,
    password,
    locationLAT = 51.5072,
    locationLNG = 0.1276,
  } = req.body; // Default location
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      locationLAT,
      locationLNG,
    });

    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.status(201).json({
      user: {
        _id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        locationLAT: savedUser.locationLAT,
        locationLNG: savedUser.locationLNG,
      },
      token,
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json("Internal Server Error");
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Login Request Body:", req.body); // Debug input data
    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found with email:", email);
      return res.status(404).json("User not found");
    }

    console.log("Found User:", user); // Debug user object

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("Invalid credentials for user:", email);
      return res.status(400).json("Invalid credentials");
    }
    // Check if location data is missing, and update if necessary
    if (user.locationLAT === null || user.locationLNG === null) {
      user.locationLAT = 0; // Set a default location
      user.locationLNG = 0; // Set a default location
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    // routes/auth.js - Login route response
    res.status(200).json({
      token,
      user: { _id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err); // Log the error
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});
module.exports = router;
