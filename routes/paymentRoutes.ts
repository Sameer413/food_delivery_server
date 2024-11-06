import express from "express";

import { isAuthenticated } from "../middleware/auth";
import { createPayment, verifyPayment } from "../controller/paymentController";

const router = express.Router();

router.route("/create-payment").post(isAuthenticated, createPayment);
router.route("/verify-payment").post(isAuthenticated, verifyPayment);

export default router;
