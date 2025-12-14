async function loadCategories() {
  const { data } = await supabase
    .from("categories")
    .select()
    .order("created_at");

  const container = document.getElementById("categories");
  container.innerHTML = "";

  data.forEach(cat => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="emoji">${cat.emoji}</div>
      <div>
        <h3>${cat.title}</h3>
        <p>${cat.description || ""}</p>
      </div>
      <span class="arrow">›</span>
    `;
    div.onclick = () => {
      location.href = `collections.html?category=${cat.id}&title=${encodeURIComponent(cat.title)}`;
    };
    container.appendChild(div);
  });
}

loadCategories();
