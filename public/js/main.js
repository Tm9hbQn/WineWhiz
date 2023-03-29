const socket = io('http://localhost:3000');

const messages = document.querySelector('#messages');
const userInput = document.querySelector('#user-message');
const sendBtn = document.querySelector('#send-btn');

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

sendBtn.addEventListener('click', () => {
  sendMessage();
});

userInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = userInput.value.trim();

  if (message) {
    // Send the message to the server
    socket.emit('message', message);

    // Add the message to the chat
    const messageEl = document.createElement('div');
    messageEl.classList.add('message-container', 'user-message-container');
    messageEl.innerHTML = `
      <div class="message user-message">${message}</div>
    `;
    messages.appendChild(messageEl);
    scrollToBottom();
    // Clear the input field
    userInput.value = '';
  }
}

socket.on('bot-message', (message) => {
  // Add the bot's message to the chat
  const messageEl = document.createElement('div');
  messageEl.classList.add('message-container', 'bot-message-container');
  messageEl.innerHTML = `
    <div class="message bot-message">${message}</div>
  `;
  messages.appendChild(messageEl);
  messages.scrollTop = messages.scrollHeight;
  
});
