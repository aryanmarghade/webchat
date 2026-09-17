const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

function validText(value, maxLength) {
    return typeof value === "string" &&
        value.trim().length > 0 &&
        value.length <= maxLength;
}

function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function broadcast(room, data, except = null) {
    const users = rooms.get(room);

    if (!users) return;

    users.forEach(user => {
        if (user !== except) {
            send(user.ws, data);
        }
    });
}

wss.on("connection", (ws) => {
    ws.user = null;

    send(ws, {
        type: "system",
        text: "Connected to WebChat server."
    });

    ws.on("message", (raw) => {
        let data;

        try {
            data = JSON.parse(raw.toString());
        } catch {
            send(ws, {
                type: "error",
                text: "Invalid message format."
            });
            return;
        }

        if (data.type === "join") {
            if (!validText(data.username, 30) ||
                !validText(data.room, 30)) {
                send(ws, {
                    type: "error",
                    text: "Invalid username or room ID."
                });
                return;
            }

            if (ws.user) {
                send(ws, {
                    type: "error",
                    text: "You are already in a room."
                });
                return;
            }

            const username = data.username.trim();
            const room = data.room.trim();

            if (!rooms.has(room)) {
                rooms.set(room, new Set());
            }

            ws.user = {
                username,
                room
            };

            rooms.get(room).add({
                ws,
                username
            });

            send(ws, {
                type: "joined",
                username,
                room
            });

            broadcast(room, {
                type: "system",
                text: `${username} joined the room.`
            }, [...rooms.get(room)].find(u => u.ws === ws));

            return;
        }

        if (data.type === "message") {
            if (!ws.user) {
                send(ws, {
                    type: "error",
                    text: "Join a room first."
                });
                return;
            }

            if (!validText(data.text, 500)) {
                send(ws, {
                    type: "error",
                    text: "Message must contain 1-500 characters."
                });
                return;
            }

            const message = {
                type: "message",
                username: ws.user.username,
                text: data.text.trim(),
                timestamp: new Date().toISOString()
            };

            broadcast(ws.user.room, message);
            return;
        }

        if (data.type === "leave") {
            leaveRoom(ws);
        }
    });

    ws.on("close", () => {
        leaveRoom(ws);
    });
});

function leaveRoom(ws) {
    if (!ws.user) return;

    const { username, room } = ws.user;
    const users = rooms.get(room);

    if (users) {
        for (const user of users) {
            if (user.ws === ws) {
                users.delete(user);
                break;
            }
        }

        if (users.size === 0) {
            rooms.delete(room);
        } else {
            broadcast(room, {
                type: "system",
                text: `${username} left the room.`
            });
        }
    }

    ws.user = null;
}

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`WebChat server running on port ${PORT}`);
});
