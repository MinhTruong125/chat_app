document.addEventListener("DOMContentLoaded", () => {
  const socket = window.socket;
  const friendReqBox = document.getElementById("friendRequests");
  console.log("friend-socket.js is running");
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

  const friendBadge = document.getElementById("friendRequestBadge");
  const requestList = document.getElementById("friendRequestList");
  const dropdown = document.getElementById("friendRequestDropdown");

  let totalRequests = 0;

  function updateFriendBadge() {
    if (totalRequests > 0) {
      friendBadge.textContent = totalRequests;
      friendBadge.classList.remove("d-none");
    } else {
      friendBadge.classList.add("d-none");
    }
  }

  function renderFriendRequest(data) {
    const item = document.createElement("div");
    item.className = "alert alert-info d-flex justify-content-between align-items-center mb-2";
    item.innerHTML = `<span><strong>${data.fromName}</strong> đã gửi lời mời kết bạn</span>`;

    const btnGroup = document.createElement("div");

    const acceptBtn = document.createElement("button");
    acceptBtn.className = "btn btn-sm btn-success me-2";
    acceptBtn.textContent = "Chấp nhận";
    acceptBtn.onclick = () => {
      fetch(`/users/${data.from}/accept`, { method: "POST" }).then(() => {
        item.remove();
        totalRequests--;
        updateFriendBadge();
      });
    };

    const declineBtn = document.createElement("button");
    declineBtn.className = "btn btn-sm btn-outline-danger";
    declineBtn.textContent = "Từ chối";
    declineBtn.onclick = () => {
      fetch(`/users/${data.from}/decline`, { method: "POST" }).then(() => {
        item.remove();
        totalRequests--;
        updateFriendBadge();
      });
    };

    btnGroup.appendChild(acceptBtn);
    btnGroup.appendChild(declineBtn);
    item.appendChild(btnGroup);
    requestList.prepend(item);

    totalRequests++;
    updateFriendBadge();
  }

  // Nhận thông báo realtime
  socket.off("friend_request");
  socket.on("friend_request", (data) => {
    renderFriendRequest(data);
  });

  // Toggle dropdown
  document.getElementById("toggleFriendRequests")?.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  });

  // Load lại lời mời khi tải trang 
  fetch("/users/pending")
    .then(res => res.json())
    .then(pending => {
      requestList.innerHTML = "";
      totalRequests = 0;
      pending.forEach(u => renderFriendRequest({ from: u._id, fromName: u.username }));
    });

  document.querySelectorAll(".btn-request-from-profile").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.userId;

      const res = await fetch(`/users/${userId}/request`, { method: "POST" });

      if (!res.ok) {
        const html = await res.text();
        console.error("Response lỗi:", html);
        return;
      }
      const data = await res.json();

      if (res.ok) {
        btn.textContent = "Đã gửi lời mời";
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-warning");
        btn.disabled = true;
      } else {
        alert(data.message || "Lỗi khi gửi lời mời");
      }
    });
  });

  const unfriendBtn = document.querySelector(".btn-unfriend-from-profile");

    if (unfriendBtn) {
      unfriendBtn.addEventListener("click", async () => {
        const confirmed = confirm("Bạn có chắc muốn hủy kết bạn?");
        if (!confirmed) return;

        const userId = unfriendBtn.dataset.userId;
        const res = await fetch(`/users/${userId}/unfriend`, { method: "POST" });

        if (res.ok) {
          unfriendBtn.textContent = "Đã hủy kết bạn";
          unfriendBtn.classList.remove("btn-outline-danger");
          unfriendBtn.classList.add("btn-secondary");
          unfriendBtn.disabled = true;
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.message || "Lỗi khi hủy kết bạn");
        }
      });
    }

});
