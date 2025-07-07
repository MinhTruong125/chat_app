document.addEventListener("DOMContentLoaded", () => {
  const socket = window.socket;
  const friendReqBox = document.getElementById("friendRequests");

  // Hàm hiển thị UI lời mời kết bạn
  function showFriendRequestUI(data) {
    const item = document.createElement("div");
    item.className = "alert alert-info d-flex justify-content-between align-items-center";
    item.innerHTML = `<span><strong>${data.fromName}</strong> đã gửi lời mời kết bạn</span>`;

    const acceptBtn = document.createElement("button");
    acceptBtn.className = "btn btn-sm btn-success me-2";
    acceptBtn.textContent = "Chấp nhận";
    acceptBtn.onclick = () => {
      fetch(`/users/${data.from}/accept`, { method: "POST" }).then(() => {
        item.remove();
        alert("Đã chấp nhận kết bạn!");
        location.reload();
      });
    };

    const declineBtn = document.createElement("button");
    declineBtn.className = "btn btn-sm btn-outline-danger";
    declineBtn.textContent = "Từ chối";
    declineBtn.onclick = () => {
      fetch(`/users/${data.from}/decline`, { method: "POST" }).then(() => {
        item.remove();
        alert("Đã từ chối lời mời.");
      });
    };

    const btnGroup = document.createElement("div");
    btnGroup.appendChild(acceptBtn);
    btnGroup.appendChild(declineBtn);

    item.appendChild(btnGroup);
    friendReqBox?.appendChild(item);
  }

  // Lắng nghe socket chỉ 1 lần
  socket.off("friend_request");
  socket.on("friend_request", (data) => {
    console.log("[chat] Nhận lời mời kết bạn từ:", data);
    showFriendRequestUI(data);
  });

  // Tải danh sách lời mời kết bạn từ DB khi load lại trang
  fetch("/users/pending")
    .then(res => res.json())
    .then(requests => {
      requests.forEach(data => {
        showFriendRequestUI({
          from: data._id,
          fromName: data.username
        });
      });
    });
});
