const socket = window.socket;
const friendList = document.getElementById("popupFriendList");
const popupChatContainer = document.getElementById("popupChatContainer");
const globalUnreadBadge = document.getElementById("globalUnreadBadge");

const openChats = new Map(); // userId => DOM element
let totalUnread = 0;

function updateGlobalBadge() {
  if (totalUnread > 0) {
    globalUnreadBadge.textContent = totalUnread;
    globalUnreadBadge.classList.remove("d-none");
  } else {
    globalUnreadBadge.classList.add("d-none");
  }
}

function createPopup(user) {
  if (openChats.has(user._id)) return;

  const popup = document.createElement("div");
  popup.className = "card m-2 shadow";
  popup.style.width = "300px";
  popup.innerHTML = `
    <div class="card-header d-flex justify-content-between align-items-center">
      <strong>${user.username}</strong>
      <button class="btn-close" style="font-size: 0.8rem"></button>
    </div>
    <div class="card-body chat-messages" style="height: 250px; overflow-y: auto;"></div>
    <div class="card-footer d-flex">
      <input type="text" class="form-control me-2 chat-input" placeholder="Nhập tin nhắn...">
      <button class="btn btn-primary btn-send">Gửi</button>
    </div>
    <div class="typing-indicator px-2 py-1 text-muted" style="display:none; font-size: 0.8rem"></div>
  `;

  const closeBtn = popup.querySelector(".btn-close");
  const input = popup.querySelector(".chat-input");
  const sendBtn = popup.querySelector(".btn-send");
  const messages = popup.querySelector(".chat-messages");

  closeBtn.onclick = () => {
    openChats.delete(user._id);
    popup.remove();
  };


  // Infinite scroll state
  let oldestMessageId = null;
  let loadingOldMessages = false;

  function renderMessage(content, isMine, prepend = false) {
    const wrapper = document.createElement("div");
    wrapper.className = `d-flex mb-2 ${isMine ? "justify-content-end" : "justify-content-start"}`;
    const bubble = document.createElement("div");
    bubble.className = `message ${isMine ? "right" : "left"} new`;
    bubble.textContent = content;
    wrapper.appendChild(bubble);
    if (prepend) {
      messages.prepend(wrapper);
    } else {
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
    }
    setTimeout(() => bubble.classList.remove('new'), 500);
  }

  function loadMessages(initial = true) {
    let url = `/messages/${user._id}?limit=10`;
    if (!initial && oldestMessageId) {
      url += `&before=${oldestMessageId}`;
    }
    showLoadingSpinner();
    const prevHeight = messages.scrollHeight;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        hideLoadingSpinner();
        if (initial) messages.innerHTML = "";
        if (data.length > 0) {
          oldestMessageId = data[0]._id;
          data.forEach(msg => {
            const fromId = typeof msg.from === "object" ? msg.from._id || msg.from.toString() : msg.from;
            const isMine = fromId === currentUser._id;
            renderMessage(msg.content, isMine, !initial);
          });
          if (initial) {
            messages.scrollTop = messages.scrollHeight;
          } else {
            messages.scrollTop = messages.scrollHeight - prevHeight;
          }
        }
        loadingOldMessages = false;
      });
  }

  messages.addEventListener("scroll", () => {
    if (messages.scrollTop === 0 && !loadingOldMessages) {
      loadingOldMessages = true;
      showLoadingSpinner();
      loadMessages(false);
    }
  });

  function sendMessage() {
    const text = input.value.trim();
    if (text) {
      socket.emit("private_message", { to: user._id, content: text });
      renderMessage(text, true);
      input.value = "";

      socket.emit("stop_typing", { to: user._id });
      clearTimeout(input._typingTimeout);
    }
  }

  // Spinner hiệu ứng loading ở giữa popup, mờ dần khi tải xong
  function showLoadingSpinner() {
    if (!popup.querySelector('.loading-spinner')) {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner text-center py-2';
      spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div> Đang tải...';
      popup.appendChild(spinner);
    }
  }

  function hideLoadingSpinner() {
    const spinner = popup.querySelector('.loading-spinner');
    if (spinner) {
      spinner.style.transition = 'opacity 0.4s';
      spinner.style.opacity = '0';
      setTimeout(() => spinner.remove(), 400);
    }
  }

  sendBtn.onclick = sendMessage;
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    socket.emit("typing", { to: user._id, fromName: currentUser.username });
    clearTimeout(input._typingTimeout);
    input._typingTimeout = setTimeout(() => {
      socket.emit("stop_typing", { to: user._id });
    }, 1500);
  });

  popupChatContainer.appendChild(popup);
  openChats.set(user._id, popup);
  loadMessages();

  // Đọc tin nhắn và xoá chấm đỏ
  fetch(`/messages/${user._id}/mark-read`, { method: "POST" });
  socket.emit("mark_read", { from: user._id });

  const friendItem = document.querySelector(`[data-user-id="${user._id}"]`);
  const badge = friendItem?.querySelector(".badge");
  if (badge) {
    totalUnread -= parseInt(badge.textContent || "0");
    badge.remove();
    updateGlobalBadge();
  }
}

function loadPopupFriendList() {  
  fetch("/users/chat-data")
    .then(res => res.json())
    .then(users => {
      friendList.innerHTML = "";
      totalUnread = 0;

      users.forEach(user => {
        const item = document.createElement("li");
        item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
        item.setAttribute("data-user-id", user._id);

        totalUnread += user.unread || 0;

        item.innerHTML = `
          <div class="d-flex justify-content-between w-100 align-items-center">
            <div class="d-flex flex-column">
              <strong>${user.username}</strong>
              <small class="text-muted last-message">
                ${user.lastMessage ? (user.lastMessage.startsWith("Bạn:") ? user.lastMessage : `Bạn bè: ${user.lastMessage}`) : ""}
              </small>
            </div>
            ${user.unread > 0 ? `
              <span class="badge bg-danger text-white rounded-circle d-flex align-items-center justify-content-center ms-2"
                    style="min-width: 22px; height: 22px;">
                ${user.unread}
              </span>` : ''}
          </div>
        `;

        item.onclick = () => createPopup(user);
        friendList.appendChild(item);
      });

      updateGlobalBadge();
    });
}



document.getElementById("toggleChatPopup").addEventListener("click", () => {
  const dropdown = document.getElementById("chatDropdown");
  if (dropdown.style.display === "none" || dropdown.style.display === "") {
    dropdown.style.display = "block";
    loadPopupFriendList();
  } else {
    dropdown.style.display = "none";
  }
});

socket.on("private_message", (data) => {
  const item = document.querySelector(`[data-user-id="${data.from}"]`);
  const isOpen = openChats.has(data.from);
  
  if (isOpen) {
    const popup = openChats.get(data.from);
    const messages = popup.querySelector(".chat-messages");
    const wrapper = document.createElement("div");
    wrapper.className = `d-flex mb-2 justify-content-start`;
    const bubble = document.createElement("div");
    bubble.className = "message left";
    bubble.textContent = data.content;
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;

    fetch(`/messages/${data.from}/mark-read`, { method: "POST" });
    socket.emit("mark_read", { from: data.from });
  }

  if (item) {
    const lastMsgElem = item.querySelector(".last-message");
    if (lastMsgElem) {
      const isFromMe = data.from === currentUser._id;
      lastMsgElem.textContent = `${isFromMe ? "Bạn: " : "Bạn bè: "}${data.content}`;
    }

    //Chỉ tạo badge nếu là tin nhắn từ người khác
    if (!isOpen && data.from !== currentUser._id) {
      let badge = item.querySelector(".badge");
      if (badge) {
        badge.textContent = parseInt(badge.textContent || "0") + 1;
      } else {
        badge = document.createElement("span");
        badge.className = "badge bg-danger rounded-pill ms-2";
        badge.textContent = "1";
        item.querySelector("div")?.appendChild(badge);
      }
      totalUnread++;
      updateGlobalBadge();
    }
  }
});

socket.on("typing", ({ from, fromName }) => {
  const popup = openChats.get(from);
  if (popup) {
    const messages = popup.querySelector(".chat-messages");
    let typingElem = popup.querySelector(`#typing-${from}`);

    if (!typingElem) {
      typingElem = document.createElement("div");
      typingElem.id = `typing-${from}`;
      typingElem.className = "d-flex mb-2 justify-content-start";

      const bubble = document.createElement("div");
      bubble.className = "message left typing-bubble";
      bubble.innerHTML = `
        <strong class="me-2">${fromName}:</strong>
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      `;

      typingElem.appendChild(bubble);
      messages.appendChild(typingElem);
      messages.scrollTop = messages.scrollHeight;
    }
  }
});

socket.on("stop_typing", ({ from }) => {
  const popup = openChats.get(from);
  if (popup) {
    const typingElem = popup.querySelector(`#typing-${from}`);
    typingElem?.remove();
  }
});

socket.on("mark_read", ({ from }) => {
  const item = document.querySelector(`[data-user-id="${from}"]`);
  if (item) {
    const badge = item.querySelector(".badge");
    if (badge) {
      totalUnread -= parseInt(badge.textContent || "0");
      badge.remove();
      updateGlobalBadge();
    }
  }
});

loadPopupFriendList();
