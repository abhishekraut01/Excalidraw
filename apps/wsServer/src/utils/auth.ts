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
