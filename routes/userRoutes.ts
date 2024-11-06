import express from "express";
import {
  activateUser,
  changePassword,
  forgetPassword,
  getAllUsers,
  getUserInfo,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updateProfile,
} from "../controller/userController";
import { isAuthenticated, refreshAccessToken } from "../middleware/auth";

const router = express.Router();

router.route("/sign-up").post(signUp);
router.route("/activate-user").post(activateUser);
router.route("/sign-in").post(signIn);
router.route("/sign-out").get(signOut);
router.route("/user").get(isAuthenticated, getUserInfo);
router.route("/forget-password").post(forgetPassword);
router.route("/reset-password").post(resetPassword);
router.route("/update-password").put(isAuthenticated, changePassword);
router.route("/update-user").put(isAuthenticated, updateProfile);

router.route("/refresh-token").get(refreshAccessToken);

// Admin
router.route("/all-users").get(getAllUsers);

export default router;
