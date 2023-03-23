// scripts.js

document.addEventListener("DOMContentLoaded", function () {
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const chatHistory = document.getElementById("chat-history");
  let conversationId = null;
  const VITE_APP_ID = "YOUR_APP_ID"; // replace with your APP_ID
  const VITE_SECRET = "YOUR_APP_SECRET"; //replace with your APP_Secret
  const VITE_BOT_ID = YOUR_BOT_ID // fill your bot_id
  const BASE_URL="https://botastic-api.pando.im"
  
  let messageSent = false;

  function addLeftMsg(message) {
    const senderDiv = document.createElement("div");
    senderDiv.className = "chat-sender";
    const textDiv = document.createElement("div");

    // Split the message by newline characters and create a span for each line
    const lines = message.response.split("\n");
    lines.forEach((line) => {
      const span = document.createElement("span");
      span.style.marginLeft="1px";
      span.textContent = line;
      textDiv.appendChild(span);
      textDiv.appendChild(document.createElement("br")); // Add a line break after each span
    });

    senderDiv.appendChild(textDiv);
    chatHistory.appendChild(senderDiv);
  }

  function addRightMsg(message) {
    const receiverDiv = document.createElement("div");
    receiverDiv.className = "chat-receiver";

    const textDiv = document.createElement("div");
    // Split the message by newline characters and create a span for each line
    const lines = message.split("\n");
    lines.forEach((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      textDiv.appendChild(span);
      textDiv.appendChild(document.createElement("br")); // Add a line break after each span
    });
    receiverDiv.appendChild(textDiv);

    chatHistory.appendChild(receiverDiv);
  }

  function displayMessage(message) {
    addLeftMsg(message);
    messageSent = false;
  }

  function updateConversationHistory() {
    if (!conversationId) {
      return;
    }

    const url = `${BASE_URL}/api/conversations/${conversationId}`;

    function fetchConversationHistory() {
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-BOTASTIC-APPID": VITE_APP_ID,
          "X-BOTASTIC-SECRET": VITE_SECRET,
        },
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error("Error fetching conversation history");
          }
        })
        .then((responseJSON) => {
          const messages = responseJSON.data.history;

          if (messages[messages.length - 1].response === "") {
            setTimeout(() => {
              // Retry fetching conversation history if the response is empty
              fetchConversationHistory();
            }, 2000);
          } else {
            displayMessage(messages[messages.length - 1]);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }

    fetchConversationHistory();
  }

  async function createOrUpdateConversation() {
    const url = `${BASE_URL}/api/conversations`;
    const payload = {
      bot_id: VITE_BOT_ID,
      user_identity: "1", // you can just generate an uuid+userID
      lang: "en",
    };

    async function fetchWithTimeout() {
      const controller = new AbortController();
      const signal = controller.signal;
      const timeout = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-BOTASTIC-APPID": VITE_APP_ID,
            "X-BOTASTIC-SECRET": VITE_SECRET,
          },
          body: JSON.stringify(payload),
          signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Error creating or updating conversation");
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Fetch timed out, retrying...");
          return fetchWithTimeout();
        } else {
          console.error("Error:", error);
        }
      }
    }

    const responseJSON = await fetchWithTimeout();
    if (responseJSON) {
      conversationId = responseJSON.data.id;
      updateConversationHistory();
    }
  }

  sendBtn.addEventListener("click", function () {
    const message = chatInput.value.trim();
    if (message && !messageSent) {
      addRightMsg(message);
      chatInput.value = "";
      messageSent = true;
    } else {
      messageSent = false;
    }

    if (!conversationId) {
      createOrUpdateConversation();
    }

    if (!conversationId) {
      setTimeout(() => {
        chatInput.value = message;
        sendBtn.click();
      }, 6000);
      return;
    }

    if (message) {
      const url = `${BASE_URL}/api/conversations/${conversationId}`;
      const data = { content: message };

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BOTASTIC-APPID": VITE_APP_ID,
          "X-BOTASTIC-SECRET": VITE_SECRET,
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error("Error sending message");
          }
        })
        .then((data) => {
          chatInput.value = "";
          updateConversationHistory();
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  });

  refreshBtn.addEventListener("click", function () {
    createOrUpdateConversation();
  });
});
