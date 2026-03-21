import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ─── REGISTER ───────────────────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, rollNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if user already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      rollNumber: rollNumber || null,
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error during registration." });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};