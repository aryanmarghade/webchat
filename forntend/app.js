const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const joinBtn = document.getElementById("joinBtn");

const joinScreen = document.getElementById("joinScreen");
const chatScreen = document.getElementById("chatScreen");

const status = document.getElementById("status");
const roomName = document.getElementById("roomName");

const messages = document.getElementById("messages");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const leaveBtn = document.getElementById("leaveBtn");

let socket = null;
let currentUsername = "";
let currentRoom = "";

const WS_URL = "wss://YOUR-BACKEND-DOMAIN";

function setStatus(text, connected) {
    status.textContent = text;

    status.classList.remove("connected", "disconnected");

    if (connected) {
        status.classList.add("connected");
    } else {
        status.classList.add("disconnected");
    }
}

function addMessage(username, text, own = false, timestamp = null) {

    const wrapper = document.createElement("div");
    wrapper.className = "message";

    if (own) {
        wrapper.style.marginLeft = "auto";
        wrapper.style.textAlign = "right";
    }

    const user = document.createElement("div");
    user.className = "username";
    user.textContent = username;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    wrapper.appendChild(user);
    wrapper.appendChild(bubble);

    if (timestamp) {
        const time = document.createElement("div");

        time.style.fontSize = "10px";
        time.style.color = "#737b8c";
        time.style.marginTop = "4px";

        time.textContent = new Date(timestamp).toLocaleTimeString();

        wrapper.appendChild(time);
    }

    messages.appendChild(wrapper);

    messages.scrollTop = messages.scrollHeight;
}

function addSystemMessage(text) {

    const message = document.createElement("div");

    message.className = "message system";

    message.textContent = text;

    messages.appendChild(message);

    messages.scrollTop = messages.scrollHeight;
}

function connect() {

    if (socket) {
        socket.close();
    }

    setStatus("Connecting...", false);

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {

        setStatus("Connected", true);

        socket.send(JSON.stringify({
            type: "join",
            username: currentUsername,
            room: currentRoom
        }));
    };

    socket.onmessage = (event) => {

        let data;

        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }

        if (data.type === "joined") {

            joinScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");

            roomName.textContent = data.room;

            addSystemMessage(
                `You joined room ${data.room}`
            );

            messageInput.focus();

            return;
        }

        if (data.type === "message") {

            addMessage(
                data.username,
                data.text,
                data.username === currentUsername,
                data.timestamp
            );

            return;
        }

        if (data.type === "system") {

            addSystemMessage(data.text);

            return;
        }

        if (data.type === "error") {

            addSystemMessage(`Error: ${data.text}`);

            return;
        }
    };

    socket.onerror = () => {

        setStatus("Connection error", false);

        addSystemMessage(
            "Unable to connect to the chat server."
        );
    };

    socket.onclose = () => {

        setStatus("Disconnected", false);
    };
}

joinBtn.addEventListener("click", () => {

    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();

    if (!username) {
        alert("Please enter a username.");
        return;
    }

    if (!room) {
        alert("Please enter a room ID.");
        return;
    }

    currentUsername = username;
    currentRoom = room;

    messages.innerHTML = "";

    connect();
});

function sendMessage() {

    const text = messageInput.value.trim();

    if (!text) {
        return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {

        addSystemMessage(
            "You are not connected to the server."
        );

        return;
    }

    socket.send(JSON.stringify({
        type: "message",
        text: text
    }));

    messageInput.value = "";

    messageInput.focus();
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        sendMessage();
    }
});

leaveBtn.addEventListener("click", () => {

    if (socket && socket.readyState === WebSocket.OPEN) {

        socket.send(JSON.stringify({
            type: "leave"
        }));

        socket.close();
    }

    chatScreen.classList.add("hidden");
    joinScreen.classList.remove("hidden");

    setStatus("Disconnected", false);

    messages.innerHTML = "";
});
