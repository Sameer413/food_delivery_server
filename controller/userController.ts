import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import ejs from "ejs";
import path from "path";
import jwt, { Secret } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";
import {
  createActivationToken,
  createForgotToken,
} from "../utils/activationToken";
import { sendEmail } from "../utils/sendMail";
import { sendToken } from "../utils/jwt";
import { user } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: user | null;
      params: {
        restaurantId: string;
      };
    }
  }
}

interface ISignUpBody {
  email: string;
  password: string;
}

export const signUp = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password }: ISignUpBody = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Enter all fields", 400));
    }

    const isEmailExist = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (isEmailExist) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    const user: ISignUpBody = {
      email,
      password,
    };

    const activationToken = createActivationToken(user);

    const activationCode = activationToken.activationCode;

    const data = { user: { email: user.email }, activationCode };

    try {
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      await sendEmail({
        email: user.email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data: data,
      });

      res.status(200).json({
        success: true,
        message: `Please check your email ${user.email}`,
        activationToken: activationToken.token,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_code, activation_token }: IActivationRequest =
        req.body;

      const newUser: any = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as Secret
      );

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { email, password } = newUser.user;

      const isEmailExist = await prisma.user.findFirst({
        where: { email: email },
      });

      if (isEmailExist) {
        return next(new ErrorHandler("Email already Exists", 400));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email,
          password: hashedPassword,
        },
      });

      res.status(200).json({
        success: true,
        message: "User is created",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Error while activation", 500));
    }
  }
);

export const signIn = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password }: ISignUpBody = req.body;

      if (!email || !password) {
        throw new ErrorHandler("Enter email or password!", 400);
      }

      const user = await prisma.user.findUnique({ where: { email: email } });

      if (!user) {
        throw new ErrorHandler(`User with email ${email} not found!`, 404);
      }

      const isMatch = await bcrypt.compare(password, user.password!);

      if (!isMatch) {
        throw new ErrorHandler("Invalid email or password!", 400);
      }

      sendToken(user, 201, res);
    } catch (error: any) {
      throw new ErrorHandler(error.message, 400);
    }
  }
);

export const signOut = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    res.cookie("access_token", "", { maxAge: 1 });
    res.cookie("refresh_token", "", { maxAge: 1 });

    res.status(200).json({
      success: true,
      message: "logout succesfully",
    });
  }
);

export const getUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return next(new ErrorHandler("User id not found", 404));
      }

      const user = await prisma.user.findFirst({ where: { user_id: userId } });

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getAllUsers = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          name: true,
          email: true,
          phone_number: true,
        },
      });

      if (!users) {
        return next(new ErrorHandler("User not found", 404));
      }

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const forgetPassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new ErrorHandler("Enter your email", 400));
      }

      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      const resetToken = createForgotToken({ email });
      const activationCode = resetToken.activationCode; // Rename resetCode to activationCode

      const data = { user: { email: user.email }, activationCode };

      // Render the email template
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      // Send email with reset instructions
      await sendEmail({
        email: email,
        subject: "Reset your password",
        template: "activation-mail.ejs",
        data: data,
      });

      res.status(200).json({
        success: true,
        message: "Check your email for reseting the password",
        resetToken: resetToken.token,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error: ", 500));
    }
  }
);

export const resetPassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reset_token, code, password } = req.body;

      const resetUser: any = jwt.verify(
        reset_token,
        process.env.ACTIVATION_SECRET as Secret
      );

      if (resetUser.activationCode !== code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.update({
        where: {
          email: resetUser.user.email,
        },
        data: {
          password: hashedPassword,
        },
      });

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error: ", 500));
    }
  }
);

export const changePassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password, newPassword, confirmPassword } = req.body;

      if (!password || !newPassword || !confirmPassword) {
        return next(new ErrorHandler("Enter all fields", 400));
      }

      const user = await prisma.user.findUnique({
        where: {
          user_id: req.user?.user_id,
        },
      });

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      const comparePassword = await bcrypt.compare(password, user.password!);

      if (!comparePassword) {
        return next(new ErrorHandler("enter correct password", 400));
      }

      if (newPassword !== confirmPassword) {
        return next(
          new ErrorHandler("new password and confirm password not matched", 400)
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updatePasswordUser = await prisma.user.update({
        where: {
          user_id: req.user?.user_id,
        },
        data: {
          password: hashedPassword,
        },
      });

      if (!updatePasswordUser) {
        return next(new ErrorHandler("Error while updating password", 404));
      }

      res.status(200).json({
        success: true,
        message: "Password updated successful",
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error: ", 500));
    }
  }
);

export const updateProfile = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, phone_number } = req.body;
      const user_id = req.user?.user_id;

      if (!user_id) {
        return next(new ErrorHandler("User id not given", 400));
      }
      const user = await prisma.user.update({
        where: {
          user_id: user_id,
        },
        data: {
          ...(name && { name: name }),
          ...(phone_number && { phone_number: phone_number }),
        },
      });

      if (!user) {
        return next(
          new ErrorHandler("Failed to update the user information", 400)
        );
      }

      res.status(200).json({
        success: true,
        message: "user updated successful",
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error: ", 500));
    }
  }
);