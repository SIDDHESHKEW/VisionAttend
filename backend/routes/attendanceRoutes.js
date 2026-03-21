import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  markAttendance,
  getAttendanceReport,
  getMyAttendance,
  exportAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

// POST /api/attendance/mark — teacher/admin only
router.post(
  "/mark",
  authMiddleware,
  roleMiddleware(["teacher", "admin"]),
  upload.single("image"),
  markAttendance
);

// GET /api/attendance/report?subject=Math&date=2026-03-21
router.get(
  "/report",
  authMiddleware,
  roleMiddleware(["teacher", "admin"]),
  getAttendanceReport
);

// GET /api/attendance/export?subject=Math&date=2026-03-21
router.get(
  "/export",
  authMiddleware,
  roleMiddleware(["teacher", "admin"]),
  exportAttendance
);

// GET /api/attendance/my — student views own records
router.get("/my", authMiddleware, getMyAttendance);

export default router;