import { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";

const wss = new WebSocketServer({
  port: 9000,
});
console.log(`ws server is running on port 9000`);

const checkAuth = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as jwt.JwtPayload;
    if (!decoded.userId) {
      return null;
    }
    return decoded;
  } catch (error) {
    console.log("JWT Verification Failed:", error);
    return null;
  }
};

interface IUser {
  userId: string;
  rooms: string[];
  ws: WebSocket;
}

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


});
