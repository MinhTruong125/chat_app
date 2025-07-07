document.addEventListener("DOMContentLoaded", () => {
  const socket = window.socket;
  const chatBox = document.getElementById("chatBox");
  const userList = document.getElementById("userList");
  const chatHeader = document.getElementById("chatHeader");
  const typingIndicator = document.getElementById("typingIndicator");
  const messageInput = document.getElementById("messageInput");

  let selectedUser = null;
  let typingTimeout;

  function renderMessage(content, isMine) {
    const wrapper = document.createElement("div");
    wrapper.className = `d-flex mb-2 ${isMine ? "justify-content-end" : "justify-content-start"}`;

    const bubble = document.createElement("div");
    bubble.className = `message ${isMine ? "right" : "left"}`;
    bubble.textContent = content;

    wrapper.appendChild(bubble);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function loadMessages(userId) {
    fetch(`/messages/${userId}`)
      .then(res => res.json())
      .then(data => {
        chatBox.innerHTML = "";
        data.forEach(msg => renderMessage(msg.content, msg.from === currentUser.id));
      });
  }

  function loadUsers() {
    fetch('/users/chat-data')
      .then(res => res.json())
      .then(users => {
        userList.innerHTML = "";
        users.forEach(user => {
          const btn = document.createElement("button");
          btn.className = "list-group-item list-group-item-action";
          btn.setAttribute("data-user-id", user._id);

          btn.innerHTML = `
            <div class="d-flex justify-content-between w-100">
              <strong>${user.username}</strong>
              ${user.unread > 0 ? `
                <span class="badge bg-danger rounded-circle text-white text-center ms-2"
                      style="min-width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;">
                  ${user.unread}
                </span>` : ''}
            </div>
            <small class="text-muted last-message">${user.lastMessage || ''}</small>
          `;

          btn.onclick = () => {
            selectedUser = user;
            chatHeader.textContent = `Chat với ${user.username}`;
            loadMessages(user._id);

            fetch(`/messages/${user._id}/mark-read`, { method: "POST" });
            btn.querySelector(".badge")?.remove();
          };

          userList.appendChild(btn);
        });
      });
  }

  function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (text && selectedUser) {
      socket.emit("private_message", { to: selectedUser._id, content: text });
      renderMessage(text, true);
      input.value = "";

       socket.emit("stop_typing", { to: selectedUser._id });
        clearTimeout(typingTimeout);
    }
  }

  document.getElementById("sendBtn").onclick = sendMessage;

  document.getElementById("messageInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener("input", () => {
    if (selectedUser) {
      socket.emit("typing", { to: selectedUser._id, fromName: currentUser.username });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit("stop_typing", { to: selectedUser._id });
      }, 1500);
    }
  });

  if (socket.listeners("private_message").length === 0) {
    console.log("Gắn listener private_message");
    socket.on("private_message", (data) => {
      console.log("📨 Nhận tin nhắn:", data);

      const isMine = data.from === selectedUser?._id;
      const isChatting = selectedUser && selectedUser._id === data.from;

      // Nếu đang chat với người gửi
      if (isChatting) {
        renderMessage(data.content, false);

        // Đánh dấu đã đọc trên Redis
        fetch(`/messages/${data.from}/mark-read`, { method: "POST" });
        socket.emit("mark_read", { from: data.from });
      }

      //  Cập nhật lại giao diện danh sách bạn bè
      const friendItem = document.querySelector(`[data-user-id="${data.from}"]`) ||
                        document.querySelector(`[data-user-id="${currentUser.id === data.from ? selectedUser?._id : data.from}"]`);

      if (friendItem) {
        const lastMsgElem = friendItem.querySelector(".last-message");
        if (lastMsgElem) {
          const prefix = data.from === currentUser.id ? "Bạn: " : "";
          lastMsgElem.textContent = prefix + data.content;
        }

        // Cập nhật badge nếu chưa đọc
        if (!isChatting && data.from !== currentUser.id) {
          const badge = friendItem.querySelector(".badge");
          if (badge) {
            badge.textContent = parseInt(badge.textContent || "0") + 1;
          } else {
            const newBadge = document.createElement("span");
            newBadge.className = "badge bg-danger rounded-circle text-white text-center ms-2";
            newBadge.style.minWidth = "22px";
            newBadge.style.height = "22px";
            newBadge.style.display = "inline-flex";
            newBadge.style.alignItems = "center";
            newBadge.style.justifyContent = "center";
            newBadge.textContent = "1";
            friendItem.querySelector(".d-flex.justify-content-between")?.appendChild(newBadge);
          }
        }
      }
    });

    socket.on("typing", ({ from, fromName }) => {
      if (selectedUser && selectedUser._id === from) {
        const indicator = document.getElementById("typingBubble");
        if (!indicator) {
          const wrapper = document.createElement("div");
          wrapper.className = "d-flex mb-2 justify-content-start";
          wrapper.id = "typingBubble";

          const bubble = document.createElement("div");
          bubble.className = "typing-bubble";
          bubble.innerHTML = `
            <strong class="me-2">${fromName}:</strong>
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          `;

          wrapper.appendChild(bubble);
          chatBox.appendChild(wrapper);
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      }
    });

    socket.on("stop_typing", ({ from }) => {
      if (selectedUser && selectedUser._id === from) {
        const typingElem = document.getElementById("typingBubble");
        typingElem?.remove();
      }
    });
}

  loadUsers();
});
