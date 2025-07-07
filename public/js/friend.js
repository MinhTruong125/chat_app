document.addEventListener("DOMContentLoaded", () => {
  const socket = window.socket;
  const friendReqBox = document.getElementById("friendRequests");
  const userList = document.getElementById("userList");

  console.log("✅ friend.js is running");

  function getCookie(name) {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1];
  }

  function loadUsers(keyword = "") {
    fetch(`/users/search?q=${encodeURIComponent(keyword)}`)
      .then(res => res.json())
      .then(users => {
        userList.innerHTML = "";
        users.forEach(user => {
          if (user._id === currentUser.id) return;

          const btn = document.createElement("button");
          btn.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
          btn.innerHTML = `<span>${user.username}</span>`;

          const isFriend = user.friends?.includes(currentUser.id);

         
          if (isFriend) {
            btn.onclick = () => alert("Đã là bạn bè!");

            const unfriendBtn = document.createElement("button");
            unfriendBtn.className = "btn btn-sm btn-outline-danger";
            unfriendBtn.textContent = "Huỷ kết bạn";
            unfriendBtn.onclick = (e) => {
              e.stopPropagation();
              fetch(`/users/${user._id}/unfriend`, {
                method: "POST"
              }).then(() => {
                alert("Đã huỷ kết bạn!");
                loadUsers(); // cập nhật lại danh sách
              });
            };

            btn.appendChild(unfriendBtn);
          } else {
            const addBtn = document.createElement("button");
            addBtn.className = "btn btn-sm btn-outline-primary";
            addBtn.textContent = "Kết bạn";
            console.log("🔘 Đã tạo nút Kết bạn cho", user.username);
            addBtn.onclick = (e) => {
              e.stopPropagation();
              fetch(`/users/${user._id}/request`, {
                method: "POST"
              }).then(() => {
                console.log("📤 emitting friend_request_notification to", user._id);
                socket.emit("friend_request_notification", { to: user._id });
                alert("Đã gửi lời mời kết bạn!");
                addBtn.disabled = true;
                addBtn.textContent = "Đã gửi";
              });
            };
            btn.appendChild(addBtn);
          }

          userList.appendChild(btn);
        });
      });
  }

  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    loadUsers(e.target.value);
  });
  
  loadUsers();
});
