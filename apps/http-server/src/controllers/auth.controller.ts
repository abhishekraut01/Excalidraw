import { Request, Response, CookieOptions } from 'express';

import { asyncHandler } from '../utils/AsyncHandler';

export interface CustomRequest extends Request {
  user?: {
    _id: string | any;
  };
}

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7h' });
};



import {
  loginValidationSchema,
  signUpvalidationSchema,
} from '@repo/validations';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import prisma from '@repo/db/client';


export const userSignUp = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = signUpvalidationSchema.safeParse(req.body);

  //step -1 check for user input validation
  if (!validationResult.success) {
    throw new ApiError(
      400,
      'Invalid User Input Schema',
      validationResult.error.flatten().fieldErrors as any[]
    );
  }

  const { username, email, password } = validationResult.data;

  //step 2 - check that if user already exist or not

  const isUserExist = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    }
  });

  if (isUserExist) {
    throw new ApiError(409, 'User already exist');
  }

  // Step 5: Create and save the user
  const newUser = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
    }
  });

  // Step 6: Remove sensitive fields for the response
  const createdUser = await prisma.user.findUnique({
    where: {
      id: newUser.id
    },
    select: {
      id: true,
      username: true,
      email: true,
    }
  });

  if (!createdUser) {
    throw new ApiError(500, 'Error while creating user');
  }

  // Step 7: Generate access token

  const accessToken =  generateAccessToken(createdUser.id);

  // Step 7: Return response

  interface Ioptions {
    secure: boolean;
    httpOnly: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  const options: Ioptions = {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
  };

  res
    .status(201)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(201, 'User created successfully', createdUser));
});

export const userLogin = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = loginValidationSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ApiError(
      400,
      'Invalid User Input Schema',
      validationResult.error.flatten().fieldErrors as any[]
    );
  }

  const { email, password } = validationResult.data;

  if (!email) {
    throw new ApiError(409, 'email is required');
  }

  if (!password) {
    throw new ApiError(409, 'Password is required');
  }

  // Step 2: Check if user exists in the database
  const userExist = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (!userExist) {
    throw new ApiError(409, 'User does not exist. Please signup first');
  }

  // Step 3: Check if the password is correct
  const isPasswordCorrect: boolean = await bcrypt.compare(password, userExist.password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Password is incorrect');
  }

  // Step 4 : generate access and refresh tokens

  const accessToken = generateAccessToken(userExist.id);

  const userResponse = await prisma.user.findUnique({
    where: {
      id: userExist.id
    },
    select: {
      id: true,
      username: true,
      email: true,
    }
  });

  if (!userResponse) {
    throw new ApiError(500, 'Error while fetching user data');
  }

  interface Ioptions {
    secure: boolean;
    httpOnly: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  const options: Ioptions = {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
  };

  // Step 6: Return response
  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(
      new ApiResponse(200, 'Login successful', {
        accessToken,
        user: userResponse,
      })
    );
});

export const userLogout = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const UserId: string | any = req.user?._id;

    if (!UserId) {
      throw new ApiError(401, 'User Id not found');
    }

    const options: CookieOptions = {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    };

    return res
      .status(200)
      .clearCookie('accessToken', options)
      .json(new ApiResponse(200, 'User Logged Out', {}));
  }
);


export const getUser = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'You are not authenticated');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, 'User data fetched', user));
  }
);