const searchInput = document.getElementById("searchInput");
const suggestions = document.getElementById("searchSuggestions");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();
  if (!query) {
    suggestions.innerHTML = "";
    suggestions.classList.add("d-none");
    return;
  }

  const res = await fetch(`/users/search?q=${encodeURIComponent(query)}`);
  const users = await res.json();

  suggestions.innerHTML = "";
  users.forEach(user => {
    if (user._id === currentUser.id) return;

    const item = document.createElement("li");
    item.className = "list-group-item list-group-item-action d-flex align-items-center";
    item.style.cursor = "pointer";

    item.innerHTML = `
      <img src="${user.avatarUrl || '/images/default-avatar.png'}" class="rounded-circle me-2" width="32" height="32">
      <span>${user.username}</span>
    `;

    item.onclick = () => {
      window.location.href = `/users/${user._id}`;
    };

    suggestions.appendChild(item);
  });

  suggestions.classList.toggle("d-none", users.length === 0);
});

// Ẩn danh sách khi click ngoài
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.classList.add("d-none");
  }
});
