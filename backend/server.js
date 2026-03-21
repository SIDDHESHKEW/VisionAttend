import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ─── Serve uploaded images as static files ────────────────────────────────────
app.use("/uploads", express.static("uploads"));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("✅ VisionAttend API is running."));

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log("\x1b[34m%s\x1b[0m", "🚀 VisionAttend Server Running on PORT " + PORT);
      console.log("\x1b[32m%s\x1b[0m", "✅ Attendance Pipeline Ready");
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

startServer();