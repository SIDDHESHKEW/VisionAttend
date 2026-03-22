import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  markAttendance,
  previewAttendance,
  markFinalAttendance,
  getAttendanceReport,
  getMyAttendance,
  exportAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

// Preview (no DB save)
router.post("/preview",    authMiddleware, roleMiddleware(["teacher","admin"]), upload.single("image"), previewAttendance);
// Mark final (after teacher verifies)
router.post("/mark-final", authMiddleware, roleMiddleware(["teacher","admin"]), markFinalAttendance);
// Legacy direct mark
router.post("/mark",       authMiddleware, roleMiddleware(["teacher","admin"]), upload.single("image"), markAttendance);
// Reports
router.get("/report",      authMiddleware, roleMiddleware(["teacher","admin"]), getAttendanceReport);
router.get("/export",      authMiddleware, roleMiddleware(["teacher","admin"]), exportAttendance);
router.get("/my",          authMiddleware, getMyAttendance);

export default router;