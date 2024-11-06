import express from "express";

import { isAuthenticated } from "../middleware/auth";
import {
  createReview,
  deleteReviewRating,
  getReviewByRestaurantId,
  updateReview,
} from "../controller/reviewRatingController";

const router = express.Router();

router.route("/create-review").post(isAuthenticated, createReview);
router
  .route("/review")
  .delete(isAuthenticated, deleteReviewRating)
  .put(isAuthenticated, updateReview)
  .get(getReviewByRestaurantId);

export default router;
