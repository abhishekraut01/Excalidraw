import { WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";

const wss = new WebSocketServer({
  port: 9000,
});
console.log(`ws server is running on port 9000`);

const checkAuth = (token: string): JwtPayload | boolean => {
  if (!token) return false;

  try {
    const secretKey = process.env.ACCESS_TOKEN_SECRET;

    if (!secretKey) {
      return false;
    }

    const decode = jwt.verify(token, secretKey) as jwt.JwtPayload;
    if (!decode.userId) {
      return false;
    }
    return decode;
  } catch (error) {
    console.log("JWT Verification Failed:", error);
    return false;
  }
};

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

  socket.on("message", () => {});
});
