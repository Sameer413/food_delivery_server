import express from "express";

import { isAuthenticated } from "../middleware/auth";
import {
  addMenuItem,
  deleteMenuItem,
  getMenuItem,
  updateMenuItem,
} from "../controller/menuItemController";
import upload from "../utils/multerConfig";

const router = express.Router();

router
  .route("/:menu_id/add-item")
  .post(isAuthenticated, upload.single("file"), addMenuItem);
router
  .route("/menu-item/:menu_item_id")
  .delete(isAuthenticated, deleteMenuItem)
  .get(getMenuItem)
  .put(isAuthenticated, upload.single("file"), updateMenuItem);

// router.route("/test-upload").post(upload.single("file"), uploadTest);

export default router;
