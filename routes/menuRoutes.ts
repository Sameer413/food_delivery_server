import express from "express";

import { isAuthenticated } from "../middleware/auth";
import {
  createMenu,
  deleteMenu,
  getAllMenu,
  updateMenuCard,
} from "../controller/menuController";

const router = express.Router();

router.route("/:restaurant_id/create-menu").post(isAuthenticated, createMenu);
router
  .route("/:menu_id/menu")
  .delete(isAuthenticated, deleteMenu)
  .put(isAuthenticated, updateMenuCard);

router.route("/:restaurant_id/menu").get(getAllMenu);

export default router;
