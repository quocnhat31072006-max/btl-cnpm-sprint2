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

// =================== TẠO NHÓM ===================
app.post("/create-group", async (req, res) => {
  const { userId, groupName } = req.body;

  if (!userId || !groupName) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin tạo nhóm!" });
  }

  try {
    // 1️⃣ Tạo nhóm mới
    const result = await pool.query(
      "INSERT INTO groups (group_name, created_by) VALUES ($1, $2) RETURNING group_id",
      [groupName, userId]
    );

    const groupId = result.rows[0].group_id;

    // 2️⃣ Thêm người tạo vào bảng groupMembers
    await pool.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')",
      [groupId, userId]
    );

    res.json({ success: true, message: "Tạo nhóm thành công!", groupId });
  } catch (err) {
    console.error(">>> DB error in /create-group:", err);
    res.status(500).json({ success: false, message: "Lỗi tạo nhóm", error: err.message });
  }
});

// =================== DANH SÁCH NHÓM CỦA NGƯỜI DÙNG ===================
app.get("/groups", async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ success: false, message: "Thiếu userId!" });

  try {
    const result = await pool.query(
      `SELECT g.group_id, g.group_name
        FROM groups g
        JOIN group_members gm ON g.group_id = gm.group_id
        WHERE gm.user_id = $1`,
      [userId]
    );

    res.json({ success: true, groups: result.rows });
  } catch (err) {
    console.error(">>> DB error in /groups:", err);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách nhóm" });
  }
});
// =================== THÊM THÀNH VIÊN VÀO NHÓM ===================
app.post("/add-member", async (req, res) => {
  const { groupId, username } = req.body;

  if (!groupId || !username)
    return res.status(400).json({ success: false, message: "Thiếu thông tin!" });

  try {
    // 1️⃣ Kiểm tra user tồn tại chưa
    const userResult = await pool.query(
      "SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "Người dùng không tồn tại!" });
    }

    const userId = userResult.rows[0].user_id;

    // 2️⃣ Kiểm tra xem user đã có trong nhóm chưa
    const exists = await pool.query(
      "SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (exists.rows.length > 0) {
      return res.json({ success: false, message: "Thành viên đã ở trong nhóm!" });
    }

    // 3️⃣ Thêm thành viên vào nhóm
    await pool.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
      [groupId, userId]
    );

    res.json({ success: true, message: "Thêm thành viên thành công!" });
  } catch (err) {
    console.error(">>> DB error in /add-member:", err);
    res.status(500).json({ success: false, message: "Lỗi thêm thành viên", error: err.message });
  }
});

// ===== POST /add-expense =====
const DEBUG = false; // set true khi muốn bật log debug

app.post("/add-expense", async (req, res) => {
  try {
    if (DEBUG) console.log(">>> /add-expense body:", req.body);

    // nhận các tên trường khả dĩ
    const { title, amount, category, groupId, payerId, createdBy } = req.body;

    // chấp nhận payerId hoặc createdBy
    const userId = Number(payerId ?? createdBy);
    const gId = Number(groupId);
    const amt = Number(amount);

    if (!gId || !userId || !title || !amt) {
      // trả chi tiết để frontend debug
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc! Vui lòng kiểm tra: groupId, payerId/createdBy, title, amount.",
        received: { title, amount, category, groupId, payerId, createdBy }
      });
    }

    // chèn vào bảng expenses (sử dụng tên cột đúng schema)
    const insertQuery = `
        INSERT INTO expenses (group_id, payer_id, title, amount, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING expense_id, group_id, payer_id, title, amount, date;
      `;

    const note = category || null;
    const result = await pool.query(insertQuery, [gId, userId, title, amt, note]);

    res.json({ success: true, expense: result.rows[0] });
  } catch (err) {
    console.error(">>> DB error in /add-expense:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi thêm chi tiêu", error: err.message });
  }
});
app.get("/get-expenses/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return res.status(400).json({ success: false, message: "Thiếu groupId" });

    const result = await pool.query(
      "SELECT expense_id, title, amount, date, note FROM expenses WHERE group_id = $1 ORDER BY expense_id DESC",
      [groupId]
    );

    res.json({
      success: true,
      expenses: result.rows,
    });
  } catch (err) {
    console.error("Lỗi /get-expenses:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách chi tiêu" });
  }
});

// ===== GET /get-expenses/:groupId =====
app.get("/get-expenses/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return res.status(400).json({ success: false, message: "Thiếu groupId" });

    const result = await pool.query(
      "SELECT expense_id, title, amount, date, note FROM expenses WHERE group_id = $1 ORDER BY expense_id DESC",
      [groupId]
    );

    res.json({
      success: true,
      expenses: result.rows,
    });
  } catch (err) {
    console.error("Lỗi /get-expenses:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách chi tiêu" });
  }
});

// ======= PUT /update-expense-note =======
app.post("/update-expense-tag", async (req, res) => {
  try {
    const { expenseId, newTag } = req.body;

    if (!expenseId || !newTag) {
      return res.status(400).json({ success: false, message: "Thiếu expenseId hoặc newTag" });
    }

    await pool.query("UPDATE expenses SET note = $1 WHERE expense_id = $2", [newTag, expenseId]);

    res.json({ success: true, message: "Cập nhật tag thành công!" });
  } catch (err) {
    console.error("Lỗi cập nhật tag:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi cập nhật tag" });
  }
});

app.get("/get-members/:groupId", async (req, res) => {
  const { groupId } = req.params;

  if (!groupId)
    return res.status(400).json({ success: false, message: "Thiếu groupId!" });

  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    res.json({ success: true, members: result.rows });
  } catch (err) {
    console.error("Lỗi /get-members:", err);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách thành viên" });
  }
});

// ======= Sửa chi tiêu =======
app.post("/update-expense", async (req, res) => {
  try {
    const { expenseId, title, amount } = req.body;
    if (!expenseId || !title || !amount) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu cập nhật!" });
    }

    await pool.query(
      "UPDATE expenses SET title = $1, amount = $2 WHERE expense_id = $3",
      [title, amount, expenseId]
    );

    res.json({ success: true, message: "Cập nhật thành công!" });
  } catch (err) {
    console.error("Lỗi update-expense:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi cập nhật!" });
  }
});

// ======= Xóa chi tiêu =======
app.post("/delete-expense", async (req, res) => {
  try {
    const { expenseId } = req.body;
    if (!expenseId) {
      return res.status(400).json({ success: false, message: "Thiếu ID chi tiêu!" });
    }

    await pool.query("DELETE FROM expenses WHERE expense_id = $1", [expenseId]);

    res.json({ success: true, message: "Xóa chi tiêu thành công!" });
  } catch (err) {
    console.error("Lỗi delete-expense:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi xóa!" });
  }
});


// =================== BÁO CÁO CHI TIÊU THEO THÁNG ===================
app.get("/report/monthly/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') AS month,
        SUM(amount)::numeric(10,2) AS total
      FROM expenses
      WHERE group_id = $1
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month;
      `,
      [groupId]
    );

    res.json({
      success: true,
      report: result.rows,
    });
  } catch (error) {
    console.error(">>> Lỗi khi lấy báo cáo tháng:", error);
    res
      .status(500)
      .json({ success: false, message: "Không thể lấy báo cáo chi tiêu theo tháng" });
  }
});

// ======== XUẤT FILE EXCEL BÁO CÁO ========
const XLSX = require("xlsx");
const fs = require("fs");

app.get("/report/export/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const result = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount) AS total
       FROM expenses
       WHERE group_id = $1
       GROUP BY month
       ORDER BY month;`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không có dữ liệu để xuất." });
    }

    const data = result.rows.map(r => ({
      "Tháng": r.month,
      "Tổng chi (₫)": Number(r.total)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");

    const filePath = `./report_${groupId}.xlsx`;
    XLSX.writeFile(wb, filePath);

    res.download(filePath, `BaoCaoChiTieu_${groupId}.xlsx`, err => {
      if (err) console.error(err);
      fs.unlinkSync(filePath); // xóa file sau khi tải xong
    });
  } catch (err) {
    console.error("Lỗi xuất Excel:", err);
    res.status(500).json({ success: false, message: "Lỗi khi xuất báo cáo Excel." });
  }
});