const router = require("express").Router();
const Event = require("../models/Event");
const User = require("../models/User");

router.get("/mapData", async (req, res) => {
  try {
    const users = await User.find(
      { locationLAT: { $ne: null }, locationLNG: { $ne: null } },
      "username profilePicture locationLAT locationLNG"
    );
    const events = await Event.find(
      { locationLAT: { $ne: null }, locationLNG: { $ne: null } },
      "title type subtype location locationLAT locationLNG"
    );

    res.status(200).json({ users, events });
  } catch (err) {
    console.error("Error fetching map data:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/search", async (req, res) => {
  const { query } = req.query;

  try {
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const events = await Event.find(
      { title: { $regex: `^${query}`, $options: "i" } },
      "title description type subtype location entryFee startTime endTime"
    );
    res.status(200).json(events);
  } catch (err) {
    console.error("Event Search Error:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Create an event
router.post("/", async (req, res) => {
  const {
    title,
    description,
    type,
    subtype,
    location,
    entryFee,
    startTime,
    endTime,
    maxParticipants,
    organizer,
    locationLAT,
    locationLNG,
  } = req.body;

  try {
    // Validate date logic
    if (new Date(endTime) < new Date(startTime)) {
      return res.status(400).json({
        message: "End date cannot be earlier than start date.",
      });
    }

    const newEvent = new Event({
      title,
      description,
      type,
      subtype: subtype || null,
      location,
      entryFee,
      startTime,
      endTime,
      maxParticipants,
      organizer,
      participants: [organizer],
      locationLAT,
      locationLNG,
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error("Error creating event:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Get events for a user
router.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId); // Get user's location

    if (!user || !user.locationLAT || !user.locationLNG) {
      return res.status(400).json({ message: "User location is required" });
    }
    console.log("1-Fetching events for userId:", userId);

    const userLat = user.locationLAT;
    const userLng = user.locationLNG;

    const events = await Event.find(); // Fetch all events
    const eventsWithDistance = events.map((event) => {
      if (!event.locationLAT || !event.locationLNG) return event;
      const distance = getDistanceFromLatLonInKm(
        userLat,
        userLng,
        event.locationLAT,
        event.locationLNG
      );
      console.log("2-Fetching events for userId:", userId);
      return { ...event.toObject(), distance }; // Add distance to event object
    });

    res.status(200).json(eventsWithDistance); // Return events with distances
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function for distance calculation
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Join an event
router.put("/:id/join", async (req, res) => {
  const { userId } = req.body;
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json("Event not found");
    }

    // Check if the event has already ended
    if (new Date(event.endTime) < new Date()) {
      return res
        .status(403)
        .json("This event has already ended and cannot be joined.");
    }

    // Check if the event is full
    if (event.participants.length >= event.maxParticipants) {
      return res.status(403).json("Event is full");
    }

    // Check if the user is already a participant
    if (!event.participants.includes(userId)) {
      event.participants.push(userId);
      await event.save();
      res.status(200).json("Successfully joined the event");
    } else {
      res.status(403).json("Already a participant");
    }
  } catch (err) {
    console.error("Error joining event:", err);
    res.status(500).json("Internal Server Error");
  }
});

router.put("/:id/leave", async (req, res) => {
  const { userId } = req.body;
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json("Event not found");
    }

    event.participants = event.participants.filter((id) => id !== null);

    if (event.participants.includes(userId)) {
      event.participants = event.participants.filter(
        (id) => id.toString() !== userId
      );
      await event.save();
      return res.status(200).json("Successfully left the event");
    } else {
      return res.status(403).json("Not a participant");
    }
  } catch (err) {
    console.error("Error leaving event:", err);
    return res.status(500).json("Internal server error");
  }
});

// Get participants of an event
router.get("/:id/participants", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "participants",
      "username email profilePicture"
    );
    if (!event) return res.status(404).json("Event not found");

    res.status(200).json({
      participants: event.participants,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Get details of a single event
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "username email"
    );
    if (!event) return res.status(404).json("Event not found");
    res.status(200).json(event);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get detailed information about an event
router.get("/details/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "username email profilePicture")
      .populate("participants", "username email profilePicture");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (err) {
    console.error("Error fetching event details:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Update an event
router.put("/:id", async (req, res) => {
  const { type, subtype, startTime, endTime } = req.body;

  try {
    // Validate date logic
    if (endTime && startTime && new Date(endTime) < new Date(startTime)) {
      return res.status(400).json({
        message: "End date cannot be earlier than start date.",
      });
    }

    const updatedData = { ...req.body };
    if (type) updatedData.type = type;
    if (subtype) updatedData.subtype = subtype;

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(updatedEvent);
  } catch (err) {
    console.error("Error updating event:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

router.post("/filter", async (req, res) => {
  const { type, subtype, startDate, endDate, maxDistance, location } = req.body;

  try {
    const query = {};

    // Filter by type/subtype
    if (type) query.type = type;
    if (subtype) query.subtype = subtype;

    // Filter by date range
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    // Filter by distance (if location and radius provided)
    if (location && maxDistance) {
      query.locationLAT = {
        $gte: location.lat - maxDistance / 111,
        $lte: location.lat + maxDistance / 111,
      };
      query.locationLNG = {
        $gte: location.lng - maxDistance / 111,
        $lte: location.lng + maxDistance / 111,
      };
    }

    const events = await Event.find(query);
    res.status(200).json(events);
  } catch (err) {
    console.error("Error filtering events:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});
router.get("/nearby/:userId", async (req, res) => {
  const { userId } = req.params;
  const { lat, lng, distance = 10 } = req.query;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const nearbyEvents = await Event.find({
      locationLAT: {
        $gte: parseFloat(lat) - distance / 111,
        $lte: parseFloat(lat) + distance / 111,
      },
      locationLNG: {
        $gte: parseFloat(lng) - distance / 111,
        $lte: parseFloat(lng) + distance / 111,
      },
      startTime: { $gte: new Date() }, // Only upcoming events
    }).sort({ startTime: 1 });

    res.status(200).json(nearbyEvents);
  } catch (err) {
    console.error("Error fetching nearby events:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Utility function to calculate distance using Haversine formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Endpoint to get nearby events
router.get("/nearby", async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng || !radius) {
    return res
      .status(400)
      .json({ message: "Latitude, longitude, and radius are required." });
  }

  try {
    const allEvents = await Event.find(); // Fetch all events from the database
    const nearbyEvents = allEvents.filter((event) => {
      if (!event.latitude || !event.longitude) return false; // Skip events without coordinates
      const distance = getDistanceFromLatLonInKm(
        parseFloat(lat),
        parseFloat(lng),
        event.latitude,
        event.longitude
      );
      return distance <= parseFloat(radius); // Filter by radius
    });

    res.status(200).json(nearbyEvents);
  } catch (err) {
    console.error("Error fetching nearby events:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
