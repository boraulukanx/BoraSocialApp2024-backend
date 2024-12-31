const router = require("express").Router();
const User = require("../models/User");
const multer = require("multer");
const path = require("path");

// Search Users by Username (must come BEFORE the dynamic :id route)
router.get("/search", async (req, res) => {
  const { username } = req.query;

  try {
    if (!username) {
      return res
        .status(400)
        .json({ message: "Username query parameter is required" });
    }

    const users = await User.find(
      { username: { $regex: `^${username}`, $options: "i" } }, // Case-insensitive search
      "username profilePicture"
    );

    res.status(200).json(users);
  } catch (err) {
    console.error("Search Error:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...otherDetails } = user._doc;
    res.status(200).json(otherDetails);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Update user
router.put("/:id", async (req, res) => {
  if (req.body.userId === req.params.id || req.body.isAdmin) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          $set: req.body,
        },
        { new: true }
      );
      res.status(200).json(updatedUser);
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("You can only update your own account");
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  if (req.body.userId === req.params.id || req.body.isAdmin) {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(200).json("User has been deleted");
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("You can only delete your own account");
  }
});

// Follow a user
router.put("/:id/follow", async (req, res) => {
  const { id } = req.params; // User to be followed
  const { userId } = req.body; // Current logged-in user

  if (userId !== id) {
    try {
      const user = await User.findById(id);
      const currentUser = await User.findById(userId);

      if (!user) return res.status(404).json("User not found");
      if (!currentUser) return res.status(404).json("Current user not found");

      if (!user.followers.includes(userId)) {
        await user.updateOne({ $push: { followers: userId } });
        await currentUser.updateOne({ $push: { following: id } });
        return res.status(200).json("User has been followed");
      } else {
        return res.status(403).json("You already follow this user");
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json("Internal server error");
    }
  } else {
    return res.status(403).json("You can't follow yourself");
  }
});

// Unfollow a user
router.put("/:id/unfollow", async (req, res) => {
  const { id } = req.params; // User to be unfollowed
  const { userId } = req.body; // Current logged-in user

  if (userId !== id) {
    try {
      const user = await User.findById(id);
      const currentUser = await User.findById(userId);

      if (!user) return res.status(404).json("User not found");
      if (!currentUser) return res.status(404).json("Current user not found");

      if (user.followers.includes(userId)) {
        await user.updateOne({ $pull: { followers: userId } });
        await currentUser.updateOne({ $pull: { following: id } });
        return res.status(200).json("User has been unfollowed");
      } else {
        return res.status(403).json("You don't follow this user");
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json("Internal server error");
    }
  } else {
    return res.status(403).json("You can't unfollow yourself");
  }
});

router.get("/:id/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followers = await User.find(
      { _id: { $in: user.followers } },
      "username profilePicture"
    );

    res.status(200).json(followers);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Get Followings
router.get("/:id/followings", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followings = await User.find(
      { _id: { $in: user.following } },
      "username profilePicture"
    );

    res.status(200).json(followings);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Get User Profile
router.get("/:id/profile", async (req, res) => {
  try {
    const user = await User.findById(
      req.params.id,
      "username email profilePicture followers following"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

router.put("/:id/location", async (req, res) => {
  const { locationLAT, locationLNG } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { locationLAT, locationLNG },
      { new: true }
    );
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

/*// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});
const upload = multer({ storage });

// Update profile picture
router.put(
  "/:id/profilePicture",
  upload.single("profilePicture"),
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // Current logged-in user ID

    if (id !== userId) {
      return res
        .status(403)
        .json({ message: "You can only update your own profile picture" });
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { profilePicture: req.file ? `/uploads/${req.file.filename}` : "" },
        { new: true }
      );
      res.status(200).json(updatedUser);
    } catch (err) {
      console.error("Error updating profile picture:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);*/

const cloudinary = require("../cloudinaryConfig"); // Import Cloudinary config

// Multer setup for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Update profile picture
router.put(
  "/:id/profilePicture",
  upload.single("profilePicture"),
  async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // Current logged-in user ID

    if (id !== userId) {
      return res
        .status(403)
        .json({ message: "You can only update your own profile picture" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // Upload the image to Cloudinary
      const cloudinaryResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "profile_pictures" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer); // Stream the file buffer to Cloudinary
      });

      // Update the user's profilePicture field in the database
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { profilePicture: cloudinaryResult.secure_url },
        { new: true }
      );

      res.status(200).json({
        message: "Profile picture updated successfully",
        updatedUser,
      });
    } catch (err) {
      console.error("Error updating profile picture:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// Update user location
router.put("/:id/location", async (req, res) => {
  const { id } = req.params;
  const { locationLAT, locationLNG } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.locationLAT = locationLAT;
    user.locationLNG = locationLNG;
    await user.save();

    res.status(200).json({ message: "Location updated successfully", user });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
