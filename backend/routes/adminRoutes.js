import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  getAllUsers,
  getAllAttendance,
  overrideAttendance,
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["admin"]));

router.get("/users",              getAllUsers);
router.get("/attendance",         getAllAttendance);
router.patch("/attendance/:id",   overrideAttendance);
router.delete("/user/:id",        deleteUser);   // ← fixed: /user/:id

export default router;