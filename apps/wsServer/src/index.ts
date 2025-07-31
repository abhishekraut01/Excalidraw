import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { checkAuth } from "./utils/auth";
import { IUser } from "./types";
dotenv.config();

const wss = new WebSocketServer({
  port: 9000,
});
console.log(`ws server is running on port 9000`);

const users: IUser[] = [];

wss.on("connection", (socket, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    socket.close();
    return;
  }

  const decoded = checkAuth(token);
  if (!decoded) {
    socket.close();
    return;
  }

  users.push({
    userId: decoded.userId,
    rooms: [],
    ws: socket as unknown as WebSocket,
  });

  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message as unknown as string);

    if (parsedMessage.type === "join") {
      const { roomId } = parsedMessage.data;

      if (!roomId || !message) {
        socket.close();
      }

      const user = users.find((u) => u.ws === (socket as unknown as WebSocket));

      if (!user) {
        socket.close();
        return;
      }

      user.rooms.push(roomId);
    }

    if (parsedMessage.type === "chat") {
      const { roomId, message } = parsedMessage.data;

      if (!roomId || !message) {
        socket.close();
        return;
      }

      const user = users.find((u) => u.ws === (socket as unknown as WebSocket));

      if (!user) {
        socket.close();
        return;
      }

      const usersInSameRoom = users.filter((u) => u.rooms.includes(roomId));

      const payload = JSON.stringify({
        type: "chat",
        data: {
          sender: user.userId,
          roomId,
          message,
          timestamp: Date.now(),
        },
      });

      usersInSameRoom.forEach((u) => {
        if (u.ws.readyState === WebSocket.OPEN) {
          try {
            u.ws.send(payload);
          } catch (err) {
            console.error("Error sending message:", err);
          }
        }
      });
    }

    if (parsedMessage.type === "leave-room") {
      const { roomId, message } = parsedMessage.data;
      if (!roomId || !message) {
        socket.close();
      }
    }
  });
});
