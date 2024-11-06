import "dotenv/config";
import Razorpay from "razorpay";

export const razorPay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY!,
  key_secret: process.env.RAZORPAY_API_SECRET
});
