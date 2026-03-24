import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { recognizeFacesFromClassImage } from "../services/aiService.js";
import { generateAttendanceExcel } from "../services/excelService.js";

// ─── PREVIEW (no DB insert) ───────────────────────────────────────────────────
export const previewAttendance = async (req, res) => {
  try {
    const { subject } = req.body;
    if (!req.file) return res.status(400).json({ message: "Image required." });
    if (!subject)  return res.status(400).json({ message: "Subject required." });

    const imagePath   = `uploads/${req.file.filename}`;
    const allStudents = await User.findAll({ where: { role: "student" } });
    const matched     = await recognizeFacesFromClassImage(imagePath, allStudents);
    const matchedIds  = matched.map((m) => m.studentId);

    const detectedStudents = allStudents
      .filter((s) => matchedIds.includes(s.id))
      .map((s) => ({
        id: s.id, name: s.name, rollNumber: s.rollNumber || "—", email: s.email,
        similarity: matched.find((m) => m.studentId === s.id)?.similarity || 0,
      }));

    const allStudentsList = allStudents.map((s) => ({
      id: s.id, name: s.name, rollNumber: s.rollNumber || "—",
    }));

    return res.status(200).json({
      detectedStudents,
      allStudents: allStudentsList,
      totalStudents: allStudents.length,
      imagePath,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return res.status(500).json({ message: "Preview failed." });
  }
};

// ─── MARK FINAL (teacher verified) ───────────────────────────────────────────
export const markFinalAttendance = async (req, res) => {
  try {
    const { presentStudentIds, subject } = req.body;
    if (!subject) return res.status(400).json({ message: "Subject required." });
    if (!Array.isArray(presentStudentIds)) return res.status(400).json({ message: "presentStudentIds must be array." });

    const today       = new Date().toISOString().split("T")[0];
    const allStudents = await User.findAll({ where: { role: "student" } });

    await Attendance.destroy({ where: { subject, date: today } });

    const records = allStudents.map((s) => ({
      studentId: s.id, subject, date: today,
      status: presentStudentIds.includes(s.id) ? "Present" : "Absent",
    }));

    await Attendance.bulkCreate(records);

    const presentCount = records.filter((r) => r.status === "Present").length;
    console.log(`✅ FINAL — Present: ${presentCount} | Absent: ${allStudents.length - presentCount}`);

    return res.status(200).json({
      message: "Attendance marked", date: today, subject,
      total: allStudents.length, present: presentCount, absent: allStudents.length - presentCount,
    });
  } catch (error) {
    console.error("markFinalAttendance error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── DIRECT MARK (legacy) ────────────────────────────────────────────────────
export const markAttendance = async (req, res) => {
  try {
    const { subject } = req.body;
    if (!req.file) return res.status(400).json({ message: "Image required." });
    if (!subject)  return res.status(400).json({ message: "Subject required." });

    const imagePath   = `uploads/${req.file.filename}`;
    const today       = new Date().toISOString().split("T")[0];
    const allStudents = await User.findAll({ where: { role: "student" } });
    const matched     = await recognizeFacesFromClassImage(imagePath, allStudents);
    const detectedIds = matched.map((m) => m.studentId);

    await Attendance.destroy({ where: { subject, date: today } });

    const records = allStudents.map((s) => ({
      studentId: s.id, subject, date: today,
      status: detectedIds.includes(s.id) ? "Present" : "Absent",
    }));

    await Attendance.bulkCreate(records);

    const presentCount = records.filter((r) => r.status === "Present").length;
    return res.status(200).json({
      message: "Attendance marked", date: today, subject,
      total: allStudents.length, present: presentCount,
      absent: allStudents.length - presentCount, detected: matched.length,
    });
  } catch (error) {
    console.error("markAttendance error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── REPORT ───────────────────────────────────────────────────────────────────
export const getAttendanceReport = async (req, res) => {
  try {
    const { subject, date } = req.query;
    const whereClause = {};
    if (subject) whereClause.subject = subject;
    if (date)    whereClause.date    = date;
    const records = await Attendance.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ["id","name","email","rollNumber"] }],
      order: [["date","DESC"]],
    });
    return res.status(200).json({ total: records.length, records });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── MY ATTENDANCE ────────────────────────────────────────────────────────────
export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.findAll({
      where: { studentId: req.user.id },
      order: [["date","DESC"]],
    });
    const total      = records.length;
    const present    = records.filter((r) => r.status === "Present").length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    return res.status(200).json({
      total, present, absent: total - present,
      attendancePercentage: `${percentage}%`, records,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export const exportAttendance = async (req, res) => {
  try {
    const { subject, date } = req.query;
    const whereClause = {};
    if (subject) whereClause.subject = subject;
    if (date)    whereClause.date    = date;
    const records = await Attendance.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ["id","name","email","rollNumber"] }],
      order: [["date","DESC"]],
    });
    if (records.length === 0) return res.status(404).json({ message: "No records found." });
    const workbook = await generateAttendanceExcel(records);
    const filename = subject ? `attendance_${subject}_${date||"all"}.xlsx` : "attendance_all.xlsx";
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",`attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: "Export failed." });
  }
};