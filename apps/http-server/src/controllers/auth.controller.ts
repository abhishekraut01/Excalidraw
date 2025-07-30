import { Request, Response, CookieOptions } from 'express';

import { asyncHandler } from '../utils/AsyncHandler';

export interface CustomRequest extends Request {
  user?: {
    _id: string | any;
  };
}

import {
  loginValidationSchema,
  signUpvalidationSchema,
} from '@repo/validations';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';


export const userSignUp = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = signUpvalidationSchema.safeParse(req.body);

  //step -1 check for user input validation
  if (!validationResult.success) {
    throw new ApiError(
      400,
      'Invalid User Input Schema',
      validationResult.error.errors
    );
  }

  const { username, email, password } = validationResult.data;

  //step 2 - check that if user already exist or not

  const isUserExist = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserExist) {
    throw new ApiError(409, 'User already exist');
  }

  // Step 5: Create and save the user
  const newUser = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    avatar: '',
  });

  // Step 6: Remove sensitive fields for the response
  const createdUser = await User.findById(newUser._id).select(
    '-password -refreshToken -resetPasswordToken -resetPasswordExpires'
  );

  if (!createdUser) {
    throw new ApiError(500, 'Error while creating user');
  }

  const accessToken = await createdUser.generateAccessToken();

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
      validationResult.error.errors
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
  const userExist = await User.findOne({
    email,
  });

  if (!userExist) {
    throw new ApiError(409, 'User does not exist. Please signup first');
  }

  // Step 3: Check if the password is correct
  const isPasswordCorrect: boolean = await userExist.isPasswordValid(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Password is incorrect');
  }

  // Step 4 : generate access and refresh tokens

  const accessToken = await userExist.generateAccessToken();

  const userResponse = await User.findById(userExist._id).select(
    '-password -refreshToken'
  );

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
        user: userResponse.toObject({
          getters: true,
          virtuals: false,
          versionKey: false,
        }),
      })
    );
});

export const userLogout = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const UserId: string | ObjectId | undefined = req.user?._id;

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

export const updateProfile = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiError(401, 'Unauthorized access');
    }

    const localAvatarPath = req.file?.path;
    if (!localAvatarPath) {
      throw new ApiError(400, 'Avatar file is required');
    }

    try {
      // Upload image to Cloudinary
      const avatar = await uploadOnCloudinary(localAvatarPath);
      if (!avatar) {
        throw new ApiError(500, 'Error uploading avatar file');
      }

      // Update user with the new avatar
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { avatar: avatar.url },
        { new: true, select: '-password' } // Exclude password from response
      );

      if (!updatedUser) {
        throw new ApiError(500, 'Error updating avatar');
      }

      return res
        .status(200)
        .json(new ApiResponse(200, 'Avatar updated successfully', updatedUser));
    } catch (error) {
      // Cleanup local file on error to prevent memory leak
      await fs.unlink(localAvatarPath).catch(() => {});
      throw error; // Forward to global error handler
    }
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