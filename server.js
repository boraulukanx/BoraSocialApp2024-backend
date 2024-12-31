const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const fs = require("fs");
const path = require("path");
const uploadsDir = path.join(__dirname, "uploads");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const eventRoutes = require("./routes/event");
const chatRoutes = require("./routes/chat");
const privateChatRoutes = require("./routes/privateChat");

const cloudinary = require("cloudinary").v2;

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json()); // Parses JSON requests

dotenv.config();

//SOCKET IO
const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend origin
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // User joins a chat room
  socket.on("joinChat", (chatId) => {
    console.log(`User joined chat room: ${chatId}`);
    socket.join(chatId); // Ensure the user joins the correct room
  });

  // Listen for sendMessage
  socket.on("sendMessage", (messageData) => {
    console.log(
      "Broadcasting message to room:",
      messageData.chatId,
      messageData
    );

    // Validate chatId before broadcasting
    if (!messageData.chatId) {
      console.error("Missing chatId in messageData");
      return;
    }

    // Broadcast the message to the correct room
    io.to(messageData.chatId).emit("receiveMessage", messageData);
  });

  // Typing indicator
  socket.on("typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("typing", { userId });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

//socket io finishes here

const PORT = process.env.PORT || 5000;

// Serve the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Database Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("Connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/privateChat", privateChatRoutes);

// Server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
