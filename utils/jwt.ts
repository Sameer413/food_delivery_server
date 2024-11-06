import { Response } from "express";
import { user as IUser } from "@prisma/client";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
require("dotenv").config();

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

// parse environment variables to integrates with fallback values
const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || "300",
  10
);

const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || "1200",
  10
);

// options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const signAccessToken = (user: IUser): string => {
  return jwt.sign({ id: user.user_id }, process.env.ACCESS_TOKEN!);
};

export const signRefreshToken = (user: IUser): string => {
  return jwt.sign({ id: user.user_id }, process.env.REFRESH_TOKEN!);
};

export const sendToken = async (
  user: IUser,
  statusCode: number = 200,
  res: Response
) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  try {
    await prisma.user.update({
      where: {
        user_id: user.user_id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);

    res.status(statusCode).json({
      success: true,
      user,
      accessToken,
    });
  } catch (error) {
    throw new Error("Failed to store refresh token in the database: ");
  }
};
