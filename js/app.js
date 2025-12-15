async function loadCategories() {
  const { data } = await supabase
    .from("categories")
    .select("id,title,description,emoji,logo")
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
      ${cat.logo ? `<img class="card-logo" src="assets/logo/${cat.logo}.svg" alt="Logo">` : ''}
    `;
    div.onclick = () => {
      location.href = `collections.html?category=${cat.id}&title=${encodeURIComponent(cat.title)}`;
    };
    container.appendChild(div);
  });
}

loadCategories();
