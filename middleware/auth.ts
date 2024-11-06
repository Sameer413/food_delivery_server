import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import catchAsyncError from "./catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import {
  accessTokenOptions,
  refreshTokenOptions,
  signAccessToken,
  signRefreshToken,
} from "../utils/jwt";
import { prisma } from "../utils/prisma";
import { user as IUser } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: IUser | null;
      params: {
        restaurantId: string;
      };
    }
  }
}
export const isAuthenticated = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;

    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    const decoded: any = await jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN!! as string
    );

    if (!decoded) {
      return next(new ErrorHandler("access token is not valid", 400));
    }

    const user = await prisma.user.findFirst({
      where: {
        user_id: decoded._id,
      },
      // select: {
      //   email: true,
      //   name: true,
      //   phone_number: true,
      //   user_id: true,
      //   user_type: true,
      //   created_at: true,
      //   password: true,
      //   updated_at: true,
      // },
    });

    if (!user) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    req.user = user;

    next();
  }
);

export const refreshAccessToken = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const refresh_token = req.cookies.refresh_token || req.body.refresh_token;

    if (!refresh_token) {
      return next(new ErrorHandler("Unauthorized request", 401));
    }

    try {
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN!
      ) as JwtPayload;

      // Ensure decoded payload contains the correct id property
      const userId = decoded.id;

      if (!userId) {
        return next(new ErrorHandler("Invalid token", 401));
      }

      const user = await prisma.user.findFirst({
        where: { user_id: userId },
      });

      if (!user) {
        return next(
          new ErrorHandler("Please log in to access this resource", 400)
        );
      }

      // Generate new access and refresh tokens
      const accessToken = signAccessToken(user);
      const newRefreshToken = signRefreshToken(user);

      await prisma.user.update({
        where: {
          user_id: user.user_id,
        },
        data: {
          refresh_token: newRefreshToken,
        },
      });

      // Set cookies with new tokens
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", newRefreshToken, refreshTokenOptions);

      // Send response with new tokens
      res.status(200).json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Token verification failed. Please log in again.", 401)
      );
    }
  }
);
