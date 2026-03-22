import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { Op } from "sequelize";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id","name","email","role","rollNumber","faceEmbeddings","createdAt"],
      order: [["createdAt","DESC"]],
    });
    const summary = {
      total:    users.length,
      students: users.filter((u) => u.role === "student").length,
      teachers: users.filter((u) => u.role === "teacher").length,
      admins:   users.filter((u) => u.role === "admin").length,
    };
    return res.status(200).json({ summary, users });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const { date, studentId } = req.query;
    const whereClause = {};
    if (date)      whereClause.date      = date;
    if (studentId) whereClause.studentId = studentId;

    const records = await Attendance.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ["id","name","email","rollNumber"] }],
      order: [["date","DESC"]],
    });
    const summary = {
      total:   records.length,
      present: records.filter((r) => r.status === "Present").length,
      absent:  records.filter((r) => r.status === "Absent").length,
    };
    return res.status(200).json({ summary, records });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

export const overrideAttendance = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    if (!["Present","Absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const record = await Attendance.findByPk(id);
    if (!record) return res.status(404).json({ message: "Record not found." });
    await record.update({ status });
    return res.status(200).json({ message: "Updated.", record });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user   = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot delete admin." });
    await Attendance.destroy({ where: { studentId: id } });
    await user.destroy();
    return res.status(200).json({ message: "User deleted." });
  } catch (error) {
    return res.status(500).json({ message: "Delete failed: " + error.message });
  }
};