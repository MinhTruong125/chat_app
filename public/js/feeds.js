document.addEventListener("DOMContentLoaded", () => {
  console.log("[feeds] Trang bảng tin đã được tải");
  console.log("[feeds] window.currentUser:", window.currentUser);

  if (window.socket) {
    document.querySelectorAll("[data-post-id]").forEach(postEl => {
      const postId = postEl.dataset.postId;
      if (postId) {
        window.socket.emit('join_post', postId);
        console.log("[Socket] Joined post room:", postId);
      }
    });
  }

  const form = document.querySelector("form[action='/posts']");
  const textarea = form?.querySelector("textarea[name='content']");
  const fileInput = form?.querySelector("input[type='file']");

  textarea?.addEventListener("focus", () => {
    form.classList.add("border-primary", "shadow-sm");
  });

  textarea?.addEventListener("blur", () => {
    form.classList.remove("border-primary", "shadow-sm");
  });

  fileInput?.addEventListener("change", () => {
    const previewContainer = document.getElementById("imagePreview");
    if (!previewContainer) return;

    previewContainer.innerHTML = "";
    const file = fileInput.files[0];
    if (file) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "img-fluid rounded mt-2";
      img.style.maxHeight = "200px";
      previewContainer.appendChild(img);
    }
  });

  document.querySelectorAll(".btn-like").forEach(button => {
    button.addEventListener("click", async () => {
      const postEl = button.closest("[data-post-id]");
      const postId = postEl?.dataset.postId;
      if (!postId) return;

      try {
        const res = await fetch(`/posts/${postId}/like`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lỗi khi like bài viết");

        button.querySelector(".like-count").textContent = data.likes;
        if (data.liked) {
          button.classList.remove("btn-outline-primary");
          button.classList.add("btn-primary", "text-white");
        } else {
          button.classList.remove("btn-primary", "text-white");
          button.classList.add("btn-outline-primary");
        }
      } catch (err) {
        console.error("[Like Error]", err);
        alert("Lỗi khi like bài viết: " + err.message);
      }
    });
  });

  document.querySelectorAll(".comment-form").forEach(form => {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const input = form.querySelector(".comment-input");
      const text = input.value.trim();
      if (!text) return;

      const postEl = form.closest("[data-post-id]");
      const postId = postEl?.dataset.postId;
      if (!postId) return;

      try {
        const res = await fetch(`/posts/${postId}/comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text })
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("[Comment Error] API response:", data);
          throw new Error(data.error || "Lỗi khi gửi bình luận");
        }

        const { comment } = data;
        const list = postEl.querySelector(".comment-list");
        const li = document.createElement("li");
        li.setAttribute("data-comment-id", comment._id);
        li.innerHTML = `
          <a href="/users/${comment.author._id}" class="user-link" data-user-id="${comment.author._id}">
            <img src="${comment.author.avatarUrl || '/images/default-avatar.png'}" alt="avatar" class="rounded-circle me-2" width="30" height="30">
          </a>
          <a href="/users/${comment.author._id}" class="user-link text-dark text-decoration-none" data-user-id="${comment.author._id}">
            <strong>${comment.author.username}:</strong> ${comment.content}
          </a>
          ${window.currentUser._id === comment.author._id || window.currentUser._id === postEl.dataset.userId ? 
            `<button class="btn btn-sm btn-link text-danger p-0 ms-2 btn-delete-comment" data-comment-id="${comment._id}" data-post-id="${postId}">X</button>` : ''}
        `;

        if (!list.querySelector(`[data-comment-id="${comment._id}"]`)) {
          list.appendChild(li);
        }
        input.value = "";
      } catch (err) {
        console.error("[Comment Error]", err);
        alert("Lỗi khi gửi bình luận: " + err.message);
      }
    });
  });

  document.querySelectorAll(".btn-delete-comment").forEach(btn => {
    btn.addEventListener("click", async () => {
      const commentId = btn.dataset.commentId;
      const postId = btn.dataset.postId;

      const confirmed = confirm("Bạn có chắc muốn xóa bình luận này?");
      if (!confirmed) return;

      try {
        const res = await fetch(`/posts/${postId}/comment/${commentId}/delete`, {
          method: "POST"
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Lỗi khi xóa bình luận");
        }
        btn.closest("li")?.remove();
      } catch (err) {
        console.error("[Delete Comment Error]", err);
        alert("Lỗi khi xóa bình luận: " + err.message);
      }
    });
  });

  document.addEventListener("click", function (e) {
    const userLink = e.target.closest(".user-link");
    if (userLink) {
      e.preventDefault();
      const userId = userLink.dataset.userId?.trim();
      if (!userId) return;

      if (userId === window.currentUser._id) {
        window.location.href = "/users/profile";
      } else {
        window.location.href = `/users/${userId}`;
      }
    }
  });

  document.getElementById("toggleNotif")?.addEventListener("click", async () => {
    const dropdown = document.getElementById("notifDropdown");
    const badge = document.getElementById("notifBadge");
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
      if (dropdown.style.display === "block") {
        // Đánh dấu tất cả thông báo là đã đọc
        try {
          const res = await fetch('/posts/notifications/mark-read', {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Lỗi khi đánh dấu thông báo");
          }
          badge.classList.add("d-none");
          badge.textContent = "0";
        } catch (err) {
          console.error("[Mark Read Error]", err);
          alert("Lỗi khi đánh dấu thông báo: " + err.message);
        }
      }
    } else {
      console.error("[feeds] notifDropdown not found in DOM");
    }
  });

  if (window.socket && window.currentUser) {
    window.socket.on("connect", () => {
      console.log("[Socket] Connected to server");
    });

    window.socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    window.socket.on("post_liked", ({ postId, likes, liker, liked, isLikedByCurrentUser }) => {
      console.log("[Socket] Received post_liked:", { postId, likes, liker, liked, isLikedByCurrentUser });
      const postEl = document.querySelector(`[data-post-id="${postId}"]`);
      if (!postEl) return;

      const button = postEl.querySelector(".btn-like");
      button.querySelector(".like-count").textContent = likes;
    });

    window.socket.on("post_commented", ({ postId, comment }) => {
      console.log("[Socket] Received post_commented:", { postId, comment });
      const postEl = document.querySelector(`[data-post-id="${postId}"]`);
      if (!postEl) return;

      const list = postEl.querySelector(".comment-list");
      const li = document.createElement("li");
      li.setAttribute("data-comment-id", comment._id);
      li.innerHTML = `
        <a href="/users/${comment.author._id || ''}" class="user-link" data-user-id="${comment.author._id || ''}">
          <img src="${comment.author.avatarUrl || '/images/default-avatar.png'}" alt="avatar" class="rounded-circle me-2" width="30" height="30">
        </a>
        <a href="/users/${comment.author._id || ''}" class="user-link text-dark text-decoration-none" data-user-id="${comment.author._id || ''}">
          <strong>${comment.author.username}:</strong> ${comment.content}
        </a>
        ${window.currentUser._id === (comment.author._id || '') || window.currentUser._id === postEl.dataset.userId ? 
          `<button class="btn btn-sm btn-link text-danger p-0 ms-2 btn-delete-comment" data-comment-id="${comment._id}" data-post-id="${postId}">X</button>` : ''}
      `;

      if (!list.querySelector(`[data-comment-id="${comment._id}"]`)) {
        list.appendChild(li);
      }
    });

    window.socket.on("receive_notification", (notif) => {
      console.log("[Socket] Received notification:", notif);
      const notifList = document.getElementById("notifList");
      const badge = document.getElementById("notifBadge");

      if (!notifList || !badge) {
        console.error("[feeds] notifList or notifBadge not found in DOM");
        return;
      }

      const item = document.createElement("div");
      item.className = "border-bottom pb-2";
      const createdAt = dayjs(notif.createdAt).fromNow();

      const link = document.createElement("a");
      link.href = `/posts/feeds#post_${notif.postId}`;
      link.className = "text-decoration-none";
      if (notif.type === "like") {
        link.innerHTML = `<small><strong>${notif.from}</strong> đã thích bài viết của bạn - <span class="text-muted">${createdAt}</span></small>`;
      } else if (notif.type === "comment") {
        link.innerHTML = `<small><strong>${notif.from}</strong> đã bình luận: "${notif.content}" - <span class="text-muted">${createdAt}</span></small>`;
      }

      notifList.prepend(item);
      item.appendChild(link);

      badge.classList.remove("d-none");
      const currentCount = parseInt(badge.textContent) || 0;
      badge.textContent = currentCount + 1;
    });
  }
});