// 🔐 Kiểm tra đăng nhập
const user = JSON.parse(localStorage.getItem("loggedInUser"));
if (!user) {
  alert("Bạn cần đăng nhập trước!");
  window.location.href = "login.html";
}

// 🚪 Đăng xuất
function logout() {
  localStorage.removeItem("loggedInUser");
  alert("Đăng xuất thành công!");
  window.location.href = "login.html";
}

// ➕ Thêm thẻ
function addCard(columnId) {
  const column = document.getElementById(columnId);
  const text = prompt("Nhập nội dung:");
  if (text && text.trim() !== "") {
    const card = document.createElement("div");
    card.className = "card";
    card.draggable = true;
    card.textContent = text;
    card.addEventListener("click", () => {
      if (confirm("Xóa thẻ này?")) card.remove();
    });
    enableDrag(card);
    const addBtn = column.querySelector(".add-card");
    column.insertBefore(card, addBtn);
  }
}

// ♻️ Kéo thả
function enableDrag(card) {
  card.addEventListener("dragstart", () => {
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });
}

document.querySelectorAll(".card").forEach(enableDrag);

document.querySelectorAll(".column").forEach((column) => {
  column.addEventListener("dragover", (e) => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(column, e.clientY);
    const addBtn = column.querySelector(".add-card");
    if (afterElement == null) {
      column.insertBefore(dragging, addBtn);
    } else {
      column.insertBefore(dragging, afterElement);
    }
  });
});

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll(".card:not(.dragging)")];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// 👥 Nút thêm thành viên nhanh
document.getElementById("btnAddMember").addEventListener("click", () => {
  const name = prompt("Nhập tên thành viên mới:");
  if (name) {
    const col = document.getElementById("members");
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = `👤 ${name}`;
    card.draggable = true;
    card.addEventListener("click", () => {
      if (confirm("Xóa thành viên này?")) card.remove();
    });
    enableDrag(card);
    const btn = col.querySelector(".add-card");
    col.insertBefore(card, btn);
  }
});
