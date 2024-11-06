import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";
import {
  address as IAddress,
  user as IUser,
  restaurants as IRestaurants,
} from "@prisma/client";

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

interface ICreateRestaurantBody {
  name: string;
  address: IAddress;
  phone_number: string;
  email: string;
  description?: string;
  restaurant_type: string;
  opening_hours: Date;
  closing_hours: Date;
  cuisines: string;
}

export const createRestaurant = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        address,
        closing_hours,
        cuisines,
        email,
        name,
        opening_hours,
        phone_number,
        restaurant_type,
        description,
      }: ICreateRestaurantBody = req.body;

      const user_id = req.user?.user_id;

      if (
        !name ||
        !phone_number ||
        !opening_hours ||
        !closing_hours ||
        !email
      ) {
        return next(new ErrorHandler("Enter all fields!", 400));
      }

      if (!address) {
        return next(new ErrorHandler("Enter address", 400));
      }

      const addressCreate = await prisma.address.create({
        data: {
          city: address.city,
          country: address.country ? address.country : "India",
          latitude: 25.25454,
          longitude: 25.25454,
          state: address.state,
          street: address.street,
          postal_code: address.postal_code,
        },
      });

      const restaurant = await prisma.restaurants.create({
        data: {
          user: { connect: { user_id } },
          name: name,
          address: { connect: { address_id: addressCreate.address_id } },
          description: description || "",
          cuisines: cuisines || "",
          email: email,
          opening_hours: opening_hours.toString(),
          closing_hour: closing_hours.toString(),
          phone_number: phone_number.toString(),
          restaurant_type: restaurant_type || "",
        },
      });

      res.status(201).json({
        success: true,
        message: "Restaurant registered",
        restaurant,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Internal server error" + error.message, 500)
      );
    }
  }
);

export const deleteRestaurant = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurant_id = req.params.restaurant_id;

      if (!restaurant_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const restaurant = await prisma.restaurants.delete({
        where: {
          restaurant_id: restaurant_id,
        },
      });

      if (!restaurant) {
        return next(
          new ErrorHandler(
            `Restaurant not found with id: ${restaurant_id}`,
            404
          )
        );
      }

      const address = await prisma.address.delete({
        where: {
          address_id:
            (restaurant && restaurant.address_id && restaurant.address_id) ||
            undefined,
        },
      });

      res.status(201).json({
        success: true,
        message: "Restaurant deleted successfully",
        restaurant,
        address,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getRestaurantDetail = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurant_id = req.params.restaurant_id;

      if (!restaurant_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const restaurant = await prisma.restaurants.findFirst({
        where: {
          restaurant_id: restaurant_id,
        },
        include: {
          address: true,
        },
      });

      if (!restaurant) {
        return next(new ErrorHandler("Restaurant not found", 404));
      }

      res.status(201).json({
        success: true,
        restaurant,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getAllRestaurants = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { city, name } = req.query;

      const restaurants = await prisma.restaurants.findMany({
        where: {
          address: {
            city: {
              contains: city!.toString(),
              mode: "insensitive",
            },
          },
          name: {
            contains: name?.toString(),
            mode: "insensitive",
          },
        },
        include: {
          address: true,
        },
      });

      res.status(200).json({
        success: true,
        restaurants,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const updateRestaurant = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        opening_hours,
        closing_hour,
        phone_number,
        description,
        email,
        cuisines,
        restaurant_type,
      }: IRestaurants = req.body;

      const restaurant_id = req.params.restaurant_id;

      const restaurant = await prisma.restaurants.update({
        where: {
          restaurant_id: restaurant_id,
        },
        data: {
          ...(phone_number && { phone_number }),
          ...(opening_hours && { opening_hours }),
          ...(closing_hour && { closing_hour }),
          ...(description && { description }),
          ...(restaurant_type && { restaurant_type }),
          ...(email && { email }),
          ...(cuisines && { cuisines }),
        },
      });

      res.status(200).json({
        success: true,
        message: "Restaurant detail updated successfully",
        restaurant,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const updateRestaurantAddress = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { street }: IAddress = req.body;
      const address_id = req.params.address_id;

      const address = await prisma.address.update({
        where: {
          address_id: address_id,
        },
        data: {
          ...(street && { street }),
        },
      });

      res.status(200).json({
        success: true,
        message: "Address updated successfully",
        address,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getAllRestaurantsAdmin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { state, city } = req.query;

      const restaurants = await prisma.restaurants.findMany({
        where: {
          address: {
            city: {
              contains: city?.toString(),
              mode: "insensitive",
            },
            state: {
              contains: state?.toString(),
              mode: "insensitive",
            },
          },
        },
      });

      if (!restaurants) {
        return next(
          new ErrorHandler("No restaurants available on the site", 404)
        );
      }

      res.status(200).json({
        success: true,
        restaurants,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);
