import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";

interface ICreateMenuBody {
  name:
    | "breakfast"
    | "brunch"
    | "lunch"
    | "snack"
    | "dinner"
    | "dessert"
    | "appetizer"
    | "side dish"
    | "beverage"
    | "salad"
    | "soup"
    | "specials";
  description?: string;
}

export const createMenu = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurant_id = req.params.restaurant_id;

      if (!restaurant_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const { name, description }: ICreateMenuBody = req.body;

      const menu = await prisma.menu.create({
        data: {
          name: name ? name : "Other",
          description: description ? description : undefined,
          restaurants: { connect: { restaurant_id: restaurant_id } },
        },
      });

      res.status(200).json({
        success: true,
        message: "Menu created successfully",
        menu,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const deleteMenu = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu_id = req.params.menu_id;

      if (!menu_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const menu = await prisma.menu.delete({
        where: {
          menu_id: menu_id,
        },
      });

      if (!menu) {
        return next(new ErrorHandler("Failed to delete menu", 403));
      }

      res.status(200).json({
        success: true,
        message: "Menu deleted successfully",
        menu,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getAllMenu = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurant_id = req.params.restaurant_id;

      if (!restaurant_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const menus = await prisma.menu.findMany({
        where: {
          restaurant_id: restaurant_id,
        },
        include: {
          menuItems: true,
        },
      });

      if (!menus) {
        return next(new ErrorHandler("No Menu found!", 404));
      }

      res.status(200).json({
        success: true,
        menus,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const updateMenuCard = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = req.body;
      const menu_id = req.params.menu_id;

      if (!menu_id) {
        return next(new ErrorHandler("menu_id is not given", 400));
      }

      const menu = await prisma.menu.update({
        where: {
          menu_id: menu_id,
        },
        data: {
          ...(name && { name }),
          ...(description && { description }),
        },
      });

      if (!menu) {
        return next(new ErrorHandler("Failed to updtae menu card", 400));
      }

      res.status(201).json({
        success: true,
        message: "Menu updated successfully",
        menu,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getMenuItem = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurant_id = req.params.restaurant_id;

      if (!restaurant_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const menus = await prisma.menu.findMany({
        where: {
          restaurant_id: restaurant_id,
        },
      });

      if (!menus) {
        return next(new ErrorHandler("No menu found without menu items", 404));
      }

      res.status(200).json({
        success: true,
        menus,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);
