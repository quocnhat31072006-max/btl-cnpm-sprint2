const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Kết nối Neon DB
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_jzCg4FaZOw7S@ep-royal-dawn-a1s4h4z9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

// =================== LOGIN ===================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT user_id, username FROM users WHERE LOWER(username) = LOWER($1) AND password = $2",
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
    }
  } catch (err) {
    console.error(">>> DB error in /login:", err);
    res.status(500).json({ error: err.message });
  }
});

// =================== START SERVER ===================
app.listen(3000, () =>
  console.log("🚀 Server chạy tại http://localhost:3000")
);
// =================== REGISTER ===================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin!" });
  }

  try {
    // Kiểm tra trùng tên người dùng
    const exists = await pool.query("SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)", [username]);
    if (exists.rows.length > 0) {
      return res.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
    }

    // Lưu user mới
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, password]);
    res.json({ success: true, message: "Đăng ký thành công!" });
  } catch (err) {
    console.error(">>> DB error in /register:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
  }
});
