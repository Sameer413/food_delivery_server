import { NextFunction, Request, Response } from "express";

import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";

const orderTimeouts = new Map<string, NodeJS.Timeout>();

export const createOrder = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user_id = req.user?.user_id;
      const restaurant_id = req.params.restaurant_id;

      const { total_amount, delivery_address_id, order_items } = req.body;

      const order = await prisma.orders.create({
        data: {
          user: { connect: { user_id: user_id } },
          restaurants: { connect: { restaurant_id: restaurant_id } },
          total_amount,
          address: { connect: { address_id: delivery_address_id } },
        },
      });

      if (!order) {
        return next(new ErrorHandler("Failed to add order", 401));
      }

      const createdOrderItems = await prisma.order_items.createMany({
        data: order_items.map((item: any) => ({
          order_id: order.order_id, // Link each item to the created order
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
          total: (Number(item.quantity) * Number(item.price)).toString(),
        })),
      });

      if (!createdOrderItems) {
        return next(new ErrorHandler("Failed to add order items", 401));
      }

      // Set a timeout to check the order status after 5 minutes
      const timeoutId = setTimeout(async () => {
        const currentOrder = await prisma.orders.findUnique({
          where: { order_id: order.order_id },
        });

        if (currentOrder && currentOrder.order_status === "Pending") {
          // Cancel the order if still pending
          await prisma.orders.update({
            where: { order_id: order.order_id },
            data: { order_status: "Canceled" },
          });
          console.log(`Order ${order.order_id} was auto-canceled.`);
        }

        orderTimeouts.delete(order.order_id);
      }, 1 * 60 * 1000); // 5 minutes

      orderTimeouts.set(order.order_id, timeoutId);

      res.status(200).json({
        success: true,
        message: "Order created successfully",
        order,
        createdOrderItems,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

type IStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready for Pickup"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled"
  | "Failed";

export const updateOrderStatus = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status }: { status: IStatus } = req.body;

      const order_id = req.params.order_id;

      if (!order_id) {
        return next(new ErrorHandler("Order id is not given", 400));
      }

      const order = await prisma.orders.findFirst({
        where: { order_id: order_id },
      });

      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }

      const updatedOrderStatus = await prisma.orders.update({
        where: {
          order_id: order_id,
        },
        data: {
          order_status: status,
        },
      });

      if (!updatedOrderStatus) {
        return next(new ErrorHandler("Failed while updating status", 404));
      }

      if (order.order_status !== "Pending") {
        const timeoutId = orderTimeouts.get(order.order_id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          orderTimeouts.delete(order.order_id);
          console.log(`Timeout cleared for order ${order.order_id}`);
        }
      }

      res.status(201).json({
        success: true,
        message: "Order status updated successfully",
        updatedOrderStatus,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getOrderById = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order_id = req.params.order_id;

      if (!order_id) {
        return next(new ErrorHandler("Order id is not given", 400));
      }

      const order = await prisma.orders.findUnique({
        where: {
          order_id: order_id,
        },
        include: {
          order_items: true,
        },
      });

      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }

      const orderFormatted = JSON.parse(
        JSON.stringify(order, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      res.status(200).json({
        success: true,
        order: orderFormatted,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Internal server error" + error.message, 500)
      );
    }
  }
);

export const getOrdersByUserId = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        return next(new ErrorHandler("Order id is not given", 400));
      }

      const orders = await prisma.orders.findMany({
        where: {
          user: { user_id: user_id },
        },
        include: {
          order_items: true,
        },
      });

      if (!orders) {
        return next(new ErrorHandler("Order not found", 404));
      }

      const orderFormatted = JSON.parse(
        JSON.stringify(orders, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      res.status(200).json({
        success: true,
        order: orderFormatted,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Internal server error" + error.message, 500)
      );
    }
  }
);

export const getOrdersByRestaurantId = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const restaurant_id = req.params.restaurant_id;

      if (!restaurant_id) {
        return next(new ErrorHandler("Order id is not given", 400));
      }

      const orders = await prisma.orders.findMany({
        where: {
          restaurant_id: restaurant_id,
        },
        include: {
          order_items: true,
        },
      });

      if (!orders) {
        return next(new ErrorHandler("Order not found", 404));
      }

      const orderFormatted = JSON.parse(
        JSON.stringify(orders, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      res.status(200).json({
        success: true,
        order: orderFormatted,
      });
    } catch (error: any) {
      return next(
        new ErrorHandler("Internal server error" + error.message, 500)
      );
    }
  }
);
