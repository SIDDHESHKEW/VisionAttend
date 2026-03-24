# 🚀 VisionAttend — AI-Powered Attendance System

VisionAttend is a **full-stack AI-based attendance system** that uses **face recognition** to automatically mark student attendance from a single classroom image.

It eliminates manual attendance, reduces proxy chances, and provides real-time analytics for students, teachers, and admins.

---

## 🧠 Features

### 👨‍🎓 Student

* Register with face data (multi-angle support)
* View attendance history
* Track attendance percentage

### 👨‍🏫 Teacher

* Capture/upload classroom image
* AI detects faces and suggests attendance
* Verify & confirm attendance before saving
* Export attendance to Excel

### 🧑‍💼 Admin

* View all users and attendance records
* Filter attendance (date-wise & student-wise)
* Override attendance manually
* Manage users

---

## 🤖 AI Capabilities

* Multi-face detection (30–50 students in one image)
* Face recognition using **InsightFace (buffalo_l)**
* Multi-embedding matching for better accuracy
* Works across different lighting conditions
* Human-in-the-loop verification system

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS

### Backend

* Node.js
* Express.js
* PostgreSQL (Sequelize ORM)

### AI Microservice

* Python
* FastAPI
* InsightFace

---

## 📁 Project Structure

```
VisionAttend/
│
├── backend/        → Node.js API server
├── frontend/       → React app
├── vision-attend-ai/ → Python AI service
├── start.bat       → Run all services
└── README.md
```

---

## ⚡ Quick Start (One Command Setup)

After cloning the repository:

```bash
git clone <your-repo-url>
cd VisionAttend
```

### ▶️ Run Everything

Just double-click or run:

```bash
start.bat
```

This will start:

* Backend server (Express)
* Frontend (React)
* AI service (FastAPI)

---

## 🌐 Default Ports

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| AI Service  | http://localhost:8000 |

---

## 🔐 Environment Setup

### Backend (.env)

```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/visionattend
JWT_SECRET=your_secret_key
```

---

## 🧪 How It Works

1. Student registers and uploads face data
2. AI generates face embeddings and stores them
3. Teacher uploads a classroom image
4. AI detects faces and matches with stored data
5. Teacher verifies results
6. Attendance is marked automatically

---

## 📊 Example Flow

* Detect faces → Match embeddings → Verify → Save → Export

---

## 🧑‍💻 Author

**Siddhesh Kewate**
IBM BTech

---

## 📌 Note

* AI models are not included in the repo (see `.gitignore`)
* Ensure proper lighting for best face detection results

---

## 🚀 Future Improvements

* Real-time attendance via video stream
* Mobile app support
* Advanced analytics dashboard

---

## ⭐ If you like this project

Give it a star ⭐ and share it!
