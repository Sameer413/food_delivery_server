import express from "express";

import { isAuthenticated } from "../middleware/auth";
import {
  createOrder,
  getOrderById,
  getOrdersByRestaurantId,
  getOrdersByUserId,
  updateOrderStatus,
} from "../controller/orderController";

const router = express.Router();

router.route("/:restaurant_id/create-order").post(isAuthenticated, createOrder);
router.route("/:order_id/status").post(isAuthenticated, updateOrderStatus);
router.route("/order/:order_id/").get(isAuthenticated, getOrderById);
router.route("/orders").get(isAuthenticated, getOrdersByUserId);
router
  .route("/:restaurant_id/orders")
  .get(isAuthenticated, getOrdersByRestaurantId);

export default router;
