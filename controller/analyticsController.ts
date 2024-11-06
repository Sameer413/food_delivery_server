import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";

type MonthData = {
  month: string;
  count: number;
};

export const userAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      // Set the start date for the current month
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1 // First day of the month
      );

      // Set the end date for the next month
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        1 // First day of the next month
      );

      const monthYear = startDate.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      const count = await prisma.user.count({
        where: {
          created_at: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      last12Months.push({
        month: monthYear,
        count,
      });
    }

    // Return the last12Months data after processing all months
    res.status(200).json({
      success: true,
      data: last12Months,
    });
  }
);

export const restaurantOrdersAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const restaurant_id = req.params.restaurant_id;

    const last12Months: MonthData[] = [];
    const currentDate = new Date();

    // Loop over the past 12 months to create date ranges
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        1
      );

      const monthYear = monthStart.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      // Log the month range for debugging
      console.log(
        `Checking orders from ${monthStart.toISOString()} to ${monthEnd.toISOString()}`
      );

      // Count the number of "Paid" orders for the restaurant in this month
      const orderCount = await prisma.orders.count({
        where: {
          restaurant_id: restaurant_id,
          payment_status: "Paid", // Filter explicitly for "Paid" orders
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      // console.log(`Month: ${monthYear}, Count: ${orderCount}`); // Debugging output

      last12Months.push({
        month: monthYear,
        count: orderCount,
      });
    }

    res.status(200).json({
      success: true,
      data: last12Months.reverse(), // Reversing to show oldest month first
    });
  }
);

export const restaurantSaleAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const restaurant_id = req.params.restaurant_id;

    const last12Months: { month: string; revenue: number }[] = [];
    const currentDate = new Date();
    let totalRevenue = 0;

    // Loop over the past 12 months to create date ranges
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        1
      );

      const monthYear = monthStart.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      // Fetch orders for the month
      const orders = await prisma.orders.findMany({
        where: {
          restaurant_id: restaurant_id,
          payment_status: "Paid",
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        select: {
          total_amount: true,
        },
      });

      // Calculate the sum for the month
      const monthlyRevenue = orders.reduce((sum, order) => {
        return sum + parseFloat(order.total_amount || "0");
      }, 0);

      totalRevenue += monthlyRevenue;

      last12Months.push({
        month: monthYear,
        revenue: monthlyRevenue,
      });
    }

    res.status(200).json({
      success: true,
      data: last12Months.reverse(), // Reverse to show oldest month first
      totalRevenue,
    });
  }
);

export const restaurantTotalOrderAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const restaurant_id = req.params.restaurant_id;

    const last12Months: { month: string; revenue: number }[] = [];
    const currentDate = new Date();

    let totalOrders = 0;
    let paidOrders = 0;
    let unpaidOrders = 0;

    // Loop over the past 12 months to create date ranges
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        1
      );

      const monthYear = monthStart.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      // Fetch all orders for the month
      const orders = await prisma.orders.findMany({
        where: {
          restaurant_id: restaurant_id,
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        select: {
          payment_status: true,
        },
      });

      // Update counts based on the order statuses
      totalOrders += orders.length;
      paidOrders += orders.filter(
        (order) => order.payment_status === "Paid"
      ).length;
      unpaidOrders += orders.filter(
        (order) => order.payment_status === "Unpaid"
      ).length;

      last12Months.push({
        month: monthYear,
        revenue: 0, // Optional, or you could keep revenue calculations if needed
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        paidOrders,
        unpaidOrders,
      },
    });
  }
);
