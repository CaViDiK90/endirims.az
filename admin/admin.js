/* =========================
   AUTH
========================= */

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) alert("Ошибка входа");
  else location.href = "dashboard.html";
}

async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) location.href = "login.html";
}

async function logout() {
  await supabase.auth.signOut();
  location.href = "login.html";
}

/* =========================
   CATEGORIES
========================= */

let editingCategoryId = null;
let draggedCategoryId = null;

// загрузка категорий в select (для коллекций)
async function loadCategories() {
  const { data } = await supabase
    .from("categories")
    .select()
    .order("sort_order");

  const select = document.getElementById("collectionCategorySelect");
  if (!select) return;

  categoryMap = {}; // 👈 важно
  select.innerHTML = "";

  data.forEach(c => {
    categoryMap[c.id] = `${c.emoji} ${c.title}`;

    const opt = document.createElement("option");
    opt.value = c.id;
    opt.innerText = `${c.emoji} ${c.title}`;
    select.appendChild(opt);
  });
}


// список категорий
async function renderCategoryList() {
  const { data } = await supabase
    .from("categories")
    .select()
    .order("sort_order");

  const list = document.getElementById("categoryList");
  if (!list) return;

  list.innerHTML = "";

  data.forEach(cat => {
    const div = document.createElement("div");
    div.className = "card";
    div.draggable = true;

    div.ondragstart = () => draggedCategoryId = cat.id;
    div.ondragover = e => e.preventDefault();
    div.ondrop = () => swapCategories(draggedCategoryId, cat.id);

    div.innerHTML = `
      <div class="emoji">${cat.emoji}</div>
      <div style="flex:1">
        <b>${cat.title}</b><br>
        <small>${cat.description || ""}</small>
      </div>
      <button onclick="startEditCategory('${cat.id}')">✏️</button>
      <button onclick="deleteCategory('${cat.id}')">🗑</button>
    `;

    list.appendChild(div);
  });
}

// сохранить (add / edit)
async function saveCategory() {
  const title = cat_title.value.trim();
  const description = cat_desc.value.trim();
  const emoji = cat_emoji.value.trim();

  if (!title || !emoji) {
    alert("Название и эмодзи обязательны");
    return;
  }

  if (editingCategoryId) {
    // UPDATE
    await supabase
      .from("categories")
      .update({ title, description, emoji })
      .eq("id", editingCategoryId);
  } else {
    // INSERT
    await supabase
      .from("categories")
      .insert({ title, description, emoji });
  }

  resetCategoryForm();
  loadCategories();
  renderCategoryList();
}

// начать редактирование
async function startEditCategory(id) {
  const { data } = await supabase
    .from("categories")
    .select()
    .eq("id", id)
    .single();

  editingCategoryId = id;
  cat_title.value = data.title;
  cat_desc.value = data.description || "";
  cat_emoji.value = data.emoji;

  document.getElementById("saveCategoryBtn").innerText = "Обновить категорию";
}

// удалить
async function deleteCategory(id) {
  if (!confirm("Удалить категорию?")) return;
  await supabase.from("categories").delete().eq("id", id);
  renderCategoryList();
  loadCategories();
}

function resetCategoryForm() {
  editingCategoryId = null;
  cat_title.value = "";
  cat_desc.value = "";
  cat_emoji.value = "";
  document.getElementById("saveCategoryBtn").innerText = "Сохранить категорию";
}

// drag & drop
async function swapCategories(id1, id2) {
  if (!id1 || !id2 || id1 === id2) return;

  const { data } = await supabase
    .from("categories")
    .select("id, sort_order")
    .in("id", [id1, id2]);

  if (data.length !== 2) return;

  const [a, b] = data;

  await supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);

  renderCategoryList();
}

/* =========================
   COLLECTIONS
========================= */

let editingCollectionId = null;
let categoryMap = {};


// ADD или UPDATE
async function saveCollection() {
  const payload = {
    category_id: collectionCategorySelect.value,
    title: col_title.value.trim(),
    description: col_desc.value.trim(),
    trendyol_url: col_url.value.trim()
  };

  if (!payload.title || !payload.trendyol_url) {
    alert("Название и ссылка обязательны");
    return;
  }

  if (editingCollectionId) {
    // UPDATE
    await supabase
      .from("collections")
      .update(payload)
      .eq("id", editingCollectionId);
  } else {
    // INSERT
    await supabase
      .from("collections")
      .insert(payload);
  }

  resetCollectionForm();
  renderCollectionList();
}

// START EDIT
async function startEditCollection(id) {
  const { data } = await supabase
    .from("collections")
    .select()
    .eq("id", id)
    .single();

  editingCollectionId = id;

  collectionCategorySelect.value = data.category_id;
  col_title.value = data.title;
  col_desc.value = data.description || "";
  col_url.value = data.trendyol_url;

  document.getElementById("saveCollectionBtn").innerText = "Обновить коллекцию";
}

// RESET FORM
function resetCollectionForm() {
  editingCollectionId = null;

  col_title.value = "";
  col_desc.value = "";
  col_url.value = "";

  document.getElementById("saveCollectionBtn").innerText = "Сохранить коллекцию";
}

/* =========================
   COLLECTION LIST (ADMIN)
========================= */

let draggedCollectionId = null;

async function renderCollectionList() {
  const { data, error } = await supabase
    .from("collections")
    .select()
    .order("sort_order");

  if (error) {
    console.error("Ошибка загрузки коллекций:", error);
    return;
  }

  const list = document.getElementById("collectionList");
  if (!list) return;

  list.innerHTML = "";

  data.forEach(col => {
    const div = document.createElement("div");
    div.className = "card";
    div.draggable = true;

    // drag start
    div.ondragstart = () => {
      draggedCollectionId = col.id;
    };

    // allow drop
    div.ondragover = e => e.preventDefault();

    // drop
    div.ondrop = async () => {
      await swapCollections(draggedCollectionId, col.id);
    };

    div.innerHTML = `
      <div style="flex:1">
        <b>${col.title}</b><br>
        <small>${col.description || ""}</small><br>
        <small>Категория: <b>${categoryMap[col.category_id] || "—"}</b></small>
      </div>
      <button onclick="startEditCollection('${col.id}')">✏️</button>
      <button onclick="deleteCollection('${col.id}')">🗑</button>
    `;

    list.appendChild(div);
  });
}

//Функция обмена позиций

async function swapCollections(id1, id2) {
  if (!id1 || !id2 || id1 === id2) return;

  const { data } = await supabase
    .from("collections")
    .select("id, sort_order")
    .in("id", [id1, id2]);

  if (!data || data.length !== 2) return;

  const [a, b] = data;

  await supabase
    .from("collections")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);

  await supabase
    .from("collections")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);

  renderCollectionList();
}
// топы


async function loadStats() {
  const { data } = await supabase
    .from("clicks")
    .select("type, target_id");

  const categoryCount = {};
  const collectionCount = {};

  data.forEach(c => {
    if (c.type === "category") {
      categoryCount[c.target_id] = (categoryCount[c.target_id] || 0) + 1;
    }
    if (c.type === "collection") {
      collectionCount[c.target_id] = (collectionCount[c.target_id] || 0) + 1;
    }
  });

  renderTop("topCategories", categoryCount, categoryMap);
  renderTop("topCollections", collectionCount);
}

/* =========================
   STATS: TOP LIST
========================= */

function renderTop(containerId, map, nameMap = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  container.innerHTML = "";

  if (!sorted.length) {
    container.innerText = "Нет данных";
    return;
  }

  sorted.forEach(([id, count]) => {
    const div = document.createElement("div");
    div.innerText = `${nameMap[id] || id} — ${count}`;
    container.appendChild(div);
  });
}

/* =========================
   STATS: SIMPLE CHART
========================= */

function drawChart(dataMap) {
  const canvas = document.getElementById("clickChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const values = Object.values(dataMap);
  if (!values.length) return;

  const max = Math.max(...values);
  const barWidth = 40;
  const gap = 20;

  values.forEach((value, index) => {
    const height = (value / max) * 120;
    const x = index * (barWidth + gap) + 20;
    const y = canvas.height - height - 20;

    ctx.fillRect(x, y, barWidth, height);
  });
}
