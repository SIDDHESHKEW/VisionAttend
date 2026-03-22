import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { recognizeFacesFromClassImage } from "../services/aiService.js";
import { generateAttendanceExcel } from "../services/excelService.js";

// ─── PREVIEW ATTENDANCE (no DB save) ─────────────────────────────────────────
export const previewAttendance = async (req, res) => {
  try {
    const { subject } = req.body;
    if (!req.file) return res.status(400).json({ message: "Classroom image is required." });
    if (!subject)  return res.status(400).json({ message: "Subject is required." });

    const imagePath = `uploads/${req.file.filename}`;
    console.log(`\n🔍 PREVIEW — Image: ${imagePath} | Subject: ${subject}`);

    const allStudents = await User.findAll({ where: { role: "student" } });
    const matched     = await recognizeFacesFromClassImage(imagePath, allStudents);
    const matchedIds  = matched.map((m) => m.studentId);

    // Return detected students with full details
    const detectedStudents = allStudents
      .filter((s) => matchedIds.includes(s.id))
      .map((s) => ({
        id:         s.id,
        name:       s.name,
        rollNumber: s.rollNumber,
        email:      s.email,
        similarity: matched.find((m) => m.studentId === s.id)?.similarity || 0,
      }));

    // Also return all students so teacher can add manually
    const allStudentsList = allStudents.map((s) => ({
      id:         s.id,
      name:       s.name,
      rollNumber: s.rollNumber,
    }));

    console.log(`✅ Preview: ${detectedStudents.length} detected out of ${allStudents.length}`);

    return res.status(200).json({
      detectedStudents,
      allStudents: allStudentsList,
      totalStudents: allStudents.length,
      imagePath,
      subject,
    });
  } catch (error) {
    console.error("previewAttendance error:", error);
    return res.status(500).json({ message: "Preview failed: " + error.message });
  }
};

// ─── MARK FINAL ATTENDANCE (after teacher verification) ───────────────────────
export const markFinalAttendance = async (req, res) => {
  try {
    const { studentIds, subject } = req.body;

    if (!subject)    return res.status(400).json({ message: "Subject is required." });
    if (!studentIds) return res.status(400).json({ message: "studentIds array is required." });

    const today       = new Date().toISOString().split("T")[0];
    const allStudents = await User.findAll({ where: { role: "student" } });

    if (allStudents.length === 0) {
      return res.status(404).json({ message: "No students found." });
    }

    await Attendance.destroy({ where: { subject, date: today } });

    const records = allStudents.map((student) => ({
      studentId: student.id,
      subject,
      date:   today,
      status: studentIds.includes(student.id) ? "Present" : "Absent",
    }));

    await Attendance.bulkCreate(records);

    const present = records.filter((r) => r.status === "Present").length;
    const absent  = records.filter((r) => r.status === "Absent").length;

    console.log(`\n✅ FINAL ATTENDANCE SAVED`);
    console.log(`   Subject: ${subject} | Date: ${today}`);
    console.log(`   Present: ${present} | Absent: ${absent}`);

    return res.status(200).json({
      message: "Attendance marked successfully",
      date:    today,
      subject,
      total:   allStudents.length,
      present,
      absent,
    });
  } catch (error) {
    console.error("markFinalAttendance error:", error);
    return res.status(500).json({ message: "Server error: " + error.message });
  }
};

// ─── MARK ATTENDANCE (legacy direct route) ────────────────────────────────────
export const markAttendance = async (req, res) => {
  try {
    const { subject } = req.body;
    if (!req.file) return res.status(400).json({ message: "Classroom image is required." });
    if (!subject)  return res.status(400).json({ message: "Subject is required." });

    const imagePath   = `uploads/${req.file.filename}`;
    const today       = new Date().toISOString().split("T")[0];
    const allStudents = await User.findAll({ where: { role: "student" } });

    if (allStudents.length === 0) {
      return res.status(404).json({ message: "No students found." });
    }

    const matched    = await recognizeFacesFromClassImage(imagePath, allStudents);
    const matchedIds = matched.map((m) => m.studentId);

    await Attendance.destroy({ where: { subject, date: today } });

    const records = allStudents.map((s) => ({
      studentId: s.id,
      subject,
      date:   today,
      status: matchedIds.includes(s.id) ? "Present" : "Absent",
    }));

    await Attendance.bulkCreate(records);

    const present = records.filter((r) => r.status === "Present").length;
    return res.status(200).json({
      message: "Attendance marked",
      date: today, subject,
      total: allStudents.length, present,
      absent: allStudents.length - present,
      detected: matched.length, matches: matched,
    });
  } catch (error) {
    console.error("markAttendance error:", error);
    return res.status(500).json({ message: "Server error." });
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
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── GET MY ATTENDANCE ────────────────────────────────────────────────────────
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
      total, present, absent: total - present,
      attendancePercentage: `${percentage}%`, records,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── EXPORT EXCEL ─────────────────────────────────────────────────────────────
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
    if (records.length === 0) return res.status(404).json({ message: "No records found." });

    const workbook = await generateAttendanceExcel(records);
    const filename = subject ? `attendance_${subject}_${date || "all"}.xlsx` : `attendance_all.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};