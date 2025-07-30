import { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError';
import jwt from 'jsonwebtoken';
import prisma from '@repo/db/client';


interface CustomRequest extends Request{
  user?:any
}

const authMiddleware = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Token not found');
    }

    const secretKey = process.env.ACCESS_TOKEN_SECRET;

    if (!secretKey) {
      throw new ApiError(
        500,
        'Server misconfiguration: Access token secret is missing.'
      );
    }

    const decode = jwt.verify(token, secretKey) as jwt.JwtPayload;

    if (!decode.userId) {
      throw new ApiError(401, 'Invalid token: User ID missing.');
    }

    //update user online status
    const updatedUser = await prisma.user.update({
      where: {
        id: decode.userId
      },
      data: { isOnline: true },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        isOnline: true,
      },
    });

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    req.user = updatedUser;
    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;