// 網站內容都來自 content/site.json 與 content/works.json（由後台 Pages CMS 編輯）
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl2p = (s = "") => s.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
const page = document.body.dataset.page;
let EN = {};            // 中文分類名 → 英文名
const catsOf = w => w.categories || (w.category ? [w.category] : []);
const catLabel = c => `${esc(c)}${EN[c] ? ` <span class="en">${esc(EN[c])}</span>` : ""}`;

const NAV = [
  ["works.html", "作品", "works"],
  ["services.html", "服務", "services"],
  ["about.html", "關於", "about"],
  ["contact.html", "聯絡", "contact"],
];

async function load() {
  const [site, data] = await Promise.all([
    fetch("content/site.json").then(r => r.json()),
    fetch("content/works.json").then(r => r.json()),
  ]);
  const works = (data.works || []).slice().sort((a, b) => String(b.year).localeCompare(String(a.year)));
  (site.categories || []).forEach(c => { EN[c.name] = c.en; });
  chrome(site);
  const render = { home, works: worksPage, work, services, about, contact }[page];
  render && render(site, works);
}

function chrome(site) {
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="banner">
      <a class="home" href="index.html" aria-label="${esc(site.name)} 首頁">
        ${site.logo ? `<img class="logo" src="${esc(site.logo)}" alt="${esc(site.name)}">` : `<span class="home-text">${esc(site.name)}</span>`}
      </a>
      <nav class="topbar" aria-label="主選單">
        ${NAV.map(([href, label, key]) => `<a href="${href}"${key === page || (page === "work" && key === "works") ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
      <span class="dots" aria-hidden="true">${"lgwgwlwlg".split("").map(c => `<i class="${c}"></i>`).join("")}</span>
    </header>`);
  document.body.insertAdjacentHTML("beforeend", `
    <footer>
      <span>© ${new Date().getFullYear()} ${esc(site.company || site.name)}${site.taxId ? `　統一編號 ${esc(site.taxId)}` : ""}</span>
      <nav>
        ${site.instagram ? `<a href="${esc(site.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
        ${site.facebook ? `<a href="${esc(site.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ""}
        ${site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ""}
      </nav>
    </footer>
    ${site.line ? `<a class="line-btn" href="${esc(site.line)}" target="_blank" rel="noopener">LINE 詢問</a>` : ""}`);
  const brand = site.company ? `${site.name} ${site.company.replace(/有限公司$/, "")}` : site.name;
  if (page === "home") document.title = site.seoTitle || brand;
  else document.title = `${document.title}｜${brand}`;
}

const card = w => `
  <a class="card" href="work.html?w=${encodeURIComponent(w.slug)}">
    <img src="${esc(w.cover)}" alt="${esc(w.title)}" loading="lazy">
    <p class="cat">${catsOf(w).map(esc).join("、")}｜${esc(w.client)}</p>
    <h3 class="ttl">${esc(w.title)}</h3>
  </a>`;

const main = () => document.querySelector("main");

function home(site, works) {
  const featured = works.filter(w => w.featured);
  main().innerHTML = `
    <section class="hero">
      <h1>${esc(site.tagline)}</h1>
      ${site.taglineEn ? `<p class="hero-en">${esc(site.taglineEn)}</p>` : ""}
      ${site.subline ? `<p class="hero-sub">${esc(site.subline)}</p>` : ""}
    </section>
    <div class="grid">${(featured.length ? featured : works.slice(0, 6)).map(card).join("")}</div>
    <a class="more" href="works.html">看全部作品</a>`;
}

function worksPage(site, works) {
  const used = new Set(works.flatMap(catsOf));
  const ordered = (site.categories || []).map(c => c.name);
  const cats = [...ordered, ...[...used].filter(c => !ordered.includes(c))].filter(c => used.has(c));
  const params = new URLSearchParams(location.search);
  let current = params.get("c") || "";
  main().innerHTML = `
    <h1 class="page-title">作品</h1>
    <div class="filter" role="group" aria-label="作品分類"></div>
    <div class="grid"></div>`;
  const filter = main().querySelector(".filter");
  const grid = main().querySelector(".grid");
  const draw = () => {
    filter.innerHTML = ["", ...cats].map(c =>
      `<button type="button" data-c="${esc(c)}" aria-pressed="${c === current}">${c ? catLabel(c) : `全部 <span class="en">All</span>`}</button>`).join("");
    const list = current ? works.filter(w => catsOf(w).includes(current)) : works;
    grid.innerHTML = list.length ? list.map(card).join("") : `<p class="notice">這個分類還沒有作品。</p>`;
  };
  filter.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    current = b.dataset.c;
    history.replaceState(null, "", current ? `?c=${encodeURIComponent(current)}` : location.pathname);
    draw();
  });
  draw();
}

// 內容區塊：行內格式（**粗體**、換行）
const inline = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
const paras = (s = "") => s.split(/\n\s*\n/).map(p => `<p>${inline(p)}</p>`).join("");
const imgs = (list = [], alt = "") => list.filter(Boolean).map(src => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`).join("");

const BLOCKS = {
  "標題": b => `<h2 class="b-heading">${inline(b.text)}</h2>`,
  "文字": b => `<div class="b-text">${paras(b.text)}</div>`,
  "製作名單": b => `<dl class="b-credits">${(b.text || "").split("\n").filter(l => l.trim()).map(l => {
      const [k, ...v] = l.split(/[｜|]/); return v.length ? `<dt>${esc(k.trim())}</dt><dd>${esc(v.join("｜").trim())}</dd>` : `<dd class="full">${esc(l)}</dd>`;
    }).join("")}</dl>`,
  "圖片": b => {
    const n = Math.min(Math.max(parseInt(b.columns) || (b.images || []).length || 1, 1), 3);
    const r = { "正方形 1:1": "r-1-1", "橫式 3:2": "r-3-2", "直式 4:5": "r-4-5" }[b.ratio] || "";
    return `<figure class="b-images cols-${n} ${r}">${imgs(b.images)}${b.caption ? `<figcaption>${inline(b.caption)}</figcaption>` : ""}</figure>`;
  },
  "圖文並排": b => `<div class="b-split ${b.imageSide === "右" ? "img-right" : ""}"><div class="b-split-img">${imgs((b.images || []).slice(0, 1))}</div><div class="b-split-text">${paras(b.text)}</div></div>`,
  "分隔線": () => `<hr class="b-rule">`,
};

function work(site, works) {
  const slug = new URLSearchParams(location.search).get("w");
  const i = works.findIndex(w => w.slug === slug);
  if (i < 0) { main().innerHTML = `<p class="notice">找不到這件作品。<a class="more" href="works.html">回到作品列表</a></p>`; return; }
  const w = works[i];
  const prev = works[i - 1], next = works[i + 1];
  document.title = w.title + document.title.slice(document.title.indexOf("｜"));
  const blocks = (w.blocks || []).filter(b => b && BLOCKS[b.type]);
  const body = blocks.length
    ? `<div class="blocks">${blocks.map(b => BLOCKS[b.type](b)).join("")}</div>`
    : `<div class="work-images">
        <img src="${esc(w.cover)}" alt="${esc(w.title)}">
        ${(w.images || []).map(src => `<img src="${esc(src)}" alt="" loading="lazy">`).join("")}
      </div>`;
  main().innerHTML = `
    <article>
      <div class="work-head">
        <div>
          <h1>${esc(w.title)}</h1>
          <dl class="meta">
            <dt>客戶</dt><dd>${esc(w.client)}</dd>
            <dt>類別</dt><dd>${catsOf(w).map(c => `<a href="works.html?c=${encodeURIComponent(c)}">${catLabel(c)}</a>`).join("<br>")}</dd>
            ${w.year ? `<dt>年份</dt><dd>${esc(w.year)}</dd>` : ""}
          </dl>
        </div>
        <div class="work-desc">${nl2p(w.description)}</div>
      </div>
      ${body}
      <nav class="pager" aria-label="其他作品">
        <span>${prev ? `<a href="work.html?w=${encodeURIComponent(prev.slug)}">上一件：${esc(prev.title)}</a>` : ""}</span>
        <span>${next ? `<a href="work.html?w=${encodeURIComponent(next.slug)}">下一件：${esc(next.title)}</a>` : ""}</span>
      </nav>
    </article>`;
}

function services(site) {
  main().innerHTML = `
    <h1 class="page-title">服務</h1>
    <div class="list">${(site.services || []).map(s => `<div><h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></div>`).join("")}</div>`;
}

function about(site) {
  main().innerHTML = `<h1 class="page-title">關於</h1><div class="prose">${nl2p(site.intro)}</div>`;
}

function contact(site) {
  const rows = [
    ["Email", site.email && `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`],
    ["電話", site.phone && esc(site.phone)],
    ["地址", site.address && esc(site.address)],
    ["統一編號", site.taxId && esc(site.taxId)],
    ["LINE", site.line && `<a href="${esc(site.line)}" target="_blank" rel="noopener">加入好友詢問</a>`],
  ].filter(r => r[1]);
  main().innerHTML = `
    <h1 class="page-title">聯絡</h1>
    <p class="prose" style="margin-bottom:40px">有設計需求，歡迎來信或用 LINE 聊聊，請簡單說明品牌、需求項目與預計時程。</p>
    <div class="list">${rows.map(([k, v]) => `<div><h2>${k}</h2><p>${v}</p></div>`).join("")}</div>`;
}

load().catch(() => {
  main().innerHTML = `<p class="notice">內容載入失敗。若是在自己電腦上直接開檔案，請改用本機伺服器預覽（見 README）。</p>`;
});
