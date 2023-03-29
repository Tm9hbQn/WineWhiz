const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const config = new Configuration({
  apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(config);

const chatGPT = async (message, conversation) => {
  try {
    // Add the user message to the conversation array
    conversation.push({
      role: "user",
      content: message + process.env.USER_PROMPT_DISCLAIMERS,
    });

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: conversation,
    });

    // Add the assistant message to the conversation array
    const assistantMessage = response["data"]["choices"][0]["message"]["content"];
    conversation.push({ role: "assistant", content: assistantMessage });

    return assistantMessage;
  } catch (error) {
    console.error("Error while communicating with OpenAI API:", error.message);
    return "I'm sorry, but an error occurred while processing your request. Please try again later.";
  }
};

module.exports = chatGPT;
