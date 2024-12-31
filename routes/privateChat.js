const router = require("express").Router();
const PrivateChat = require("../models/PrivateChat");
const User = require("../models/User");

router.post("/getOrCreate", async (req, res) => {
  const { userId1, userId2 } = req.body;

  try {
    console.log("Received data for getOrCreate:", req.body);

    const user1 = await User.findById(userId1);
    const user2 = await User.findById(userId2);

    if (!user1 || !user2) {
      console.error("One or both users not found:", userId1, userId2);
      return res.status(404).json({ message: "User(s) not found." });
    }

    const isMutualFollower =
      user1.following.includes(userId2) && user2.following.includes(userId1);

    if (!isMutualFollower) {
      console.error("Mutual following validation failed:", userId1, userId2);
      return res
        .status(403)
        .json({ message: "Private chat requires mutual following." });
    }

    let chat = await PrivateChat.findOne({
      participants: { $all: [userId1, userId2] },
    });
    console.log("Chat query result:", chat);

    if (!chat) {
      console.log("Creating new chat...");
      chat = new PrivateChat({ participants: [userId1, userId2] });
      await chat.save();
    }

    console.log("Returning chat:", chat);
    res.status(200).json(chat);
  } catch (err) {
    console.error("Error in getOrCreate:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/:chatId", async (req, res) => {
  try {
    const chat = await PrivateChat.findById(req.params.chatId).populate(
      "messages.sender",
      "username profilePicture"
    );
    res.status(200).json(chat);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/:chatId/message", async (req, res) => {
  const { chatId } = req.params;
  const { sender, message } = req.body;

  try {
    const chat = await PrivateChat.findById(chatId);
    if (!chat) return res.status(404).json("Chat not found");

    const newMessage = { sender, message, timestamp: new Date() };
    chat.messages.push(newMessage);
    await chat.save();

    // Populate sender details
    const populatedSender = await User.findById(
      newMessage.sender,
      "username profilePicture"
    );
    const populatedMessage = {
      ...newMessage,
      sender: populatedSender,
      chatId, // Include chatId in the response
    };

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

// Fetch all private chats for a user
router.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch user's following and followers
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const mutualFollowers = user.followers.filter((followerId) =>
      user.following.includes(followerId.toString())
    );

    const chats = await PrivateChat.find({
      participants: userId,
    })
      .populate("participants", "username profilePicture")
      .populate("messages.sender", "username profilePicture");

    const filteredChats = chats.filter((chat) =>
      chat.participants.some((participant) =>
        mutualFollowers.includes(participant._id.toString())
      )
    );

    res.status(200).json(filteredChats);
  } catch (err) {
    console.error("Error fetching private chats:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

router.get("/available/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const mutualFollowers = user.following.filter((followedUserId) =>
      user.followers.includes(followedUserId.toString())
    );

    const activeChats = await PrivateChat.find({
      participants: id,
    });
    const activeChatUserIds = activeChats.flatMap((chat) =>
      chat.participants.map((participantId) => participantId.toString())
    );

    const availableUsers = await User.find({
      _id: { $in: mutualFollowers, $nin: activeChatUserIds },
    });

    res.status(200).json(availableUsers);
  } catch (err) {
    console.error("Error fetching available users:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

module.exports = router;
