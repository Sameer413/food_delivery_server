import express from "express";

import { isAuthenticated } from "../middleware/auth";
import {
  restaurantOrdersAnalytics,
  restaurantSaleAnalytics,
  restaurantTotalOrderAnalytics,
  userAnalytics,
} from "../controller/analyticsController";

const router = express.Router();

router.route("/user-analytic").get(userAnalytics);

router
  .route("/restaurant-order-analytic/:restaurant_id")
  .get(restaurantOrdersAnalytics);

router
  .route("/restaurant-sale-analytic/:restaurant_id")
  .get(restaurantSaleAnalytics);

router
  .route("/restaurant-order-analytics-all/:restaurant_id")
  .get(restaurantTotalOrderAnalytics);

export default router;
