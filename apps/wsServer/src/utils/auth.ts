import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";


export const checkAuth = (token: string): JwtPayload | null => {
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

/**
 * Helper function to safely send JSON messages to a WebSocket
 * Prevents crashes if the socket is closed or in an invalid state
 */
export const safeSend = (ws: WebSocket, data: any) => {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }
};

