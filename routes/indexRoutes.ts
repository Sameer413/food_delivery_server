import express from "express";
import userRoutes from "./userRoutes";
import restaurantRoutes from "./restaurantRoutes";
import menuRoutes from "./menuRoutes";
import menuItemRoutes from "./menuItemRoutes";
import orderRoutes from "./orderRoutes";
import paymentRoutes from "./paymentRoutes";
import reviewRatingRoutes from "./reviewRatingRoutes";
import analyticRoutes from "./analyticRoutes";

const router = express.Router();

router.use(userRoutes);
router.use(restaurantRoutes);
router.use(menuRoutes);
router.use(menuItemRoutes);
router.use(orderRoutes);
router.use(paymentRoutes);
router.use(reviewRatingRoutes);
router.use(analyticRoutes);

// Total 55+ Api's
// Done 35 Api's
export default router;
