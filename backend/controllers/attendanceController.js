import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { recognizeFacesFromClassImage } from "../services/aiService.js";
import { generateAttendanceExcel } from "../services/excelService.js";

// ─── MARK ATTENDANCE ──────────────────────────────────────────────────────────
export const markAttendance = async (req, res) => {
  try {
    const { subject } = req.body;

    if (!req.file) return res.status(400).json({ message: "Classroom image is required." });
    if (!subject)  return res.status(400).json({ message: "Subject is required." });

    const imagePath = `uploads/${req.file.filename}`;
    const today     = new Date().toISOString().split("T")[0];

    console.log(`📸 Class image: ${imagePath} | Subject: ${subject} | Date: ${today}`);

    // Fetch all students WITH their stored embeddings
    const allStudents = await User.findAll({ where: { role: "student" } });

    if (allStudents.length === 0) {
      return res.status(404).json({ message: "No students found in the database." });
    }

    // Call AI service — pass students so it can match faces
    const detectedStudents = await recognizeFacesFromClassImage(imagePath, allStudents);
    const detectedIds      = detectedStudents.map((s) => s.studentId);

    console.log("✅ Detected student IDs:", detectedIds);

    // Remove old records for same subject+date to avoid duplicates
    await Attendance.destroy({ where: { subject, date: today } });

    // Build attendance records
    const attendanceRecords = allStudents.map((student) => ({
      studentId: student.id,
      subject,
      date:   today,
      status: detectedIds.includes(student.id) ? "Present" : "Absent",
    }));

    await Attendance.bulkCreate(attendanceRecords);

    const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
    const absentCount  = attendanceRecords.filter((r) => r.status === "Absent").length;

    return res.status(200).json({
      message: "Attendance marked",
      date:    today,
      subject,
      total:   allStudents.length,
      present: presentCount,
      absent:  absentCount,
    });
  } catch (error) {
    console.error("Attendance marking error:", error);
    return res.status(500).json({ message: "Server error during attendance marking." });
  }
};

// ─── GET ATTENDANCE REPORT ────────────────────────────────────────────────────
export const getAttendanceReport = async (req, res) => {
  try {
    const { subject, date } = req.query;
    const whereClause = {};
    if (subject) whereClause.subject = subject;
    if (date)    whereClause.date    = date;

    const records = await Attendance.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ["id", "name", "email", "rollNumber"] }],
      order: [["date", "DESC"]],
    });

    return res.status(200).json({ total: records.length, records });
  } catch (error) {
    console.error("Get attendance report error:", error);
    return res.status(500).json({ message: "Server error fetching attendance." });
  }
};

// ─── GET STUDENT'S OWN ATTENDANCE ─────────────────────────────────────────────
export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.findAll({
      where: { studentId: req.user.id },
      order: [["date", "DESC"]],
    });

    const total      = records.length;
    const present    = records.filter((r) => r.status === "Present").length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return res.status(200).json({
      total,
      present,
      absent: total - present,
      attendancePercentage: `${percentage}%`,
      records,
    });
  } catch (error) {
    console.error("Get my attendance error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── EXPORT ATTENDANCE AS EXCEL ───────────────────────────────────────────────
export const exportAttendance = async (req, res) => {
  try {
    const { subject, date } = req.query;
    const whereClause = {};
    if (subject) whereClause.subject = subject;
    if (date)    whereClause.date    = date;

    const records = await Attendance.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ["id", "name", "email", "rollNumber"] }],
      order: [["date", "DESC"]],
    });

    if (records.length === 0) {
      return res.status(404).json({ message: "No attendance records found." });
    }

    const workbook = await generateAttendanceExcel(records);
    const filename = subject ? `attendance_${subject}_${date || "all"}.xlsx` : `attendance_all.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ Excel exported: ${filename} (${records.length} records)`);
  } catch (error) {
    console.error("Excel export error:", error);
    return res.status(500).json({ message: "Server error during Excel export." });
  }
};