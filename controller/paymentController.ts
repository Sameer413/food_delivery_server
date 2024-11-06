import "dotenv/config";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
// import { prisma } from "../utils/prisma";
import { razorPay } from "../utils/razorPayConfig";
import { prisma } from "../utils/prisma";

export const createPayment = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, currency, order_id, email } = req.body;
      const user_id = req.user?.user_id;

      const razorPayment = await razorPay.orders.create({
        amount: amount * 100,
        currency: currency || "INR",
      });

      const payment = await prisma.payments.create({
        data: {
          payment_id: razorPayment.id,
          amount: amount,
          orders: { connect: { order_id } },
          user: { connect: { user_id: user_id } },
          currency: razorPayment.currency,
          payment_status: razorPayment.status,
          payment_method: razorPayment.method,
          payer_email: email || "",
        },
      });

      res.status(200).json({
        success: true,
        payment,
      });
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const verifyPayment = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_id,
      } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET!)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        await prisma.payments.update({
          where: {
            payment_id: payment_id,
          },
          data: {
            payment_status: "completed",
            // payment_id: razorpay_payment_id,
            transaction_id: razorpay_payment_id,
          },
        });

        res.status(200).json({
          success: true,
          message: "Payment verified",
        });
      } else {
        res
          .status(400)
          .json({ success: false, message: "Payment verification failed" });
      }
    } catch (error: any) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);
