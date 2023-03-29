const chatGPT = require("../services/chatGPT");
const isWineRelated = require("../services/wineRelated");

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("Client connected");

    // Initialize the conversation history for the connected user
    let conversation = [
      {
        role: "system",
        content: process.env.ASSISTANT_INSTRUCTION,
      },
    ];

    const msg =
      "Hello, I am a wine advisor. I can help you with learning about wine, and also help you choose the perfect bottle for your needs and preferences. What would you like me to help you with today?";
    socket.emit("bot-message", msg);

    socket.on("message", async (message) => {
      console.log(`User message: ${message}`);
      if (isWineRelated(message)) {
        const response = await chatGPT(message, conversation); // Pass the conversation history
        socket.emit("bot-message", response);
      } else {
        socket.emit(
          "bot-message",
          "I can only answer wine-related questions. How may I help you?"
        );
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
};
