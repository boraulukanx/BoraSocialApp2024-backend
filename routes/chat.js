const router = require("express").Router();
const Chat = require("../models/Chat");
const Event = require("../models/Event");

router.post("/:eventId", async (req, res) => {
  const { sender, message } = req.body;

  try {
    const newMessage = new Chat({
      eventId: req.params.eventId,
      sender,
      message,
      timestamp: new Date(),
    });

    const savedMessage = await newMessage.save();

    // Populate sender details
    const populatedMessage = await savedMessage.populate(
      "sender",
      "username profilePicture"
    );

    res.status(201).json({
      ...populatedMessage.toObject(),
      chatId: `chat_${req.params.eventId}`, // Include chatId for Socket.IO broadcasting
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Get all messages for an event
router.get("/:eventId", async (req, res) => {
  try {
    const messages = await Chat.find({ eventId: req.params.eventId })
      .populate("sender", "username email profilePicture")
      .sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
