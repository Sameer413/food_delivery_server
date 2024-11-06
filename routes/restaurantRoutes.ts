import express from "express";

import { isAuthenticated } from "../middleware/auth";
import {
  createRestaurant,
  deleteRestaurant,
  getAllRestaurants,
  getAllRestaurantsAdmin,
  getRestaurantDetail,
  updateRestaurant,
  updateRestaurantAddress,
} from "../controller/restaurantController";

const router = express.Router();

router.route("/create-restaurant").post(isAuthenticated, createRestaurant);

router
  .route("/restaurant/:restaurant_id")
  .get(getRestaurantDetail)
  .delete(isAuthenticated, deleteRestaurant)
  .put(isAuthenticated, updateRestaurant);

router
  .route("/address/:address_id")
  .put(isAuthenticated, updateRestaurantAddress);

router.route("/restaurants").get(getAllRestaurants);
router.route("/all-restaurants").get(getAllRestaurantsAdmin);

export default router;
