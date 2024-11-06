import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";
import { reviews as IReviews } from "@prisma/client";

export const createReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comments, rating, restuarant_id }: IReviews = req.body;
      const user_id = req.user?.user_id;

      const review = await prisma.reviews.create({
        data: {
          comments: comments || undefined,
          rating: rating,
          restaurants: { connect: { restaurant_id: restuarant_id! } },
          user: { connect: { user_id: user_id } },
        },
      });

      const { _avg } = await prisma.reviews.aggregate({
        where: {
          restuarant_id: restuarant_id,
        },
        _avg: {
          rating: true,
        },
      });

      const avgRating = _avg.rating
        ? Math.max(0, Math.min(Number(_avg.rating), 5))
        : 0;

      await prisma.restaurants.update({
        where: {
          restaurant_id: restuarant_id!,
        },
        data: {
          rating: avgRating,
        },
      });

      res.status(200).json({
        success: true,
        message: "Review added successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const deleteReviewRating = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user_id = req.user?.user_id;
      const { restaurant_id, review_rating_id } = req.body;

      await prisma.reviews.delete({
        where: {
          review_id: review_rating_id,
          user_id: user_id,
        },
      });

      const { _avg } = await prisma.reviews.aggregate({
        where: {
          restuarant_id: restaurant_id,
        },
        _avg: {
          rating: true,
        },
      });

      const avgRating = _avg.rating
        ? Math.max(0, Math.min(Number(_avg.rating), 5))
        : 0;

      await prisma.restaurants.update({
        where: {
          restaurant_id: restaurant_id!,
        },
        data: {
          rating: avgRating,
        },
      });

      res.status(200).json({
        success: true,
        message: "Review has been removed",
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const updateReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comments, review_id } = req.body;
      const user_id = req.user?.user_id;

      await prisma.reviews.update({
        where: {
          review_id: review_id,
          user_id: user_id,
        },
        data: {
          ...(comments && { comments }),
        },
      });

      res.status(200).json({
        success: true,
        message: "Review updated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getReviewByRestaurantId = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { restaurant_id } = req.body;

      const reviews = await prisma.reviews.findMany({
        where: {
          restuarant_id: restaurant_id!,
        },
      });

      // Convert BigInt fields to strings or numbers if necessary
      const formattedReviews = reviews.map((review) => ({
        ...review,
        // Convert specific fields if they are BigInt
        review_id: review.review_id.toString(), // Example if review_id is BigInt
        rating: Number(review.rating), // Assuming rating is BigInt
        // Add other fields as necessary
      }));

      res.status(200).json({
        success: true,
        message: "Reviews fetched successfully",
        reviews: formattedReviews,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);
