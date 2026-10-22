// 網站內容都來自 content/site.json 與 content/works.json（由後台 Pages CMS 編輯）
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl2p = (s = "") => s.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
const page = document.body.dataset.page;
let EN = {};            // 中文分類名 → 英文名
const catsOf = w => w.categories || (w.category ? [w.category] : []);
const catLabel = c => `${esc(c)}${EN[c] ? ` <span class="en">${esc(EN[c])}</span>` : ""}`;

const NAV = [
  ["works", "作品", "works", "Works"],
  ["services", "服務", "services", "Services"],
  ["about", "關於", "about", "About"],
  ["contact", "聯絡", "contact", "Contact"],
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
      <a class="home" href="/" aria-label="${esc(site.name)} 首頁">
        ${site.logo ? `<img class="logo" src="${esc(site.logo)}" alt="${esc(site.name)}">` : `<span class="home-text">${esc(site.name)}</span>`}
      </a>
      <nav class="topbar" aria-label="主選單">
        ${NAV.map(([href, label, key, en]) => `<a href="${href}"${key === page || (page === "work" && key === "works") ? ' aria-current="page"' : ""}><span>${label}</span><span class="nav-en" lang="en">${en}</span></a>`).join("")}
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

// 設計項目：選單勾選＋自行新增的項目；都沒填時改顯示作品類別
const tasksOf = w => [...(w.tasks || []), ...(w.tasksCustom || [])].map(t => String(t).trim()).filter(Boolean);
const card = w => {
  const sub = tasksOf(w).length ? tasksOf(w) : catsOf(w);
  return `
  <a class="card" href="work?w=${encodeURIComponent(w.slug)}">
    <img src="${esc(w.cover)}" alt="${esc(w.title)}" loading="lazy">
    <h3 class="ttl">${esc(w.title)}</h3>
    ${sub.length ? `<p class="tasks">${sub.map(esc).join("、")}</p>` : ""}
    ${w.award ? `<p class="award">${esc(w.award)}</p>` : ""}
  </a>`;
};

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
    <a class="more" href="works">看全部作品</a>`;
}

function worksPage(site, works) {
  const used = new Set(works.flatMap(catsOf));
  const ordered = (site.categories || []).map(c => c.name);
  const cats = [...ordered, ...[...used].filter(c => !ordered.includes(c))].filter(c => used.has(c));
  const params = new URLSearchParams(location.search);
  let current = params.get("c") || "";
  main().innerHTML = `
    <h1 class="page-title">作品<span class="page-en" lang="en">Works</span></h1>
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
// 文字幅寬：全幅＝對齊滿版圖片、二分之一＝對齊兩欄圖片的一欄、三分之一＝對齊三欄圖片的一欄（預設二分之一）
const wcls = b => ({ "全幅": "w-full", "三分之一": "w-third" })[b.width] || "w-half";

const BLOCKS = {
  "標題": b => `<h2 class="b-heading ${wcls(b)}">${inline(b.text)}</h2>`,
  "文字": b => `<div class="b-text ${wcls(b)}">${paras(b.text)}</div>`,
  "製作名單": b => `<dl class="b-credits ${wcls(b)}">${(b.text || "").split("\n").filter(l => l.trim()).map(l => {
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
  if (i < 0) { main().innerHTML = `<p class="notice">找不到這件作品。<a class="more" href="works">回到作品列表</a></p>`; return; }
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
            <dt>類別</dt><dd>${catsOf(w).map(c => `<a href="works?c=${encodeURIComponent(c)}">${catLabel(c)}</a>`).join("<br>")}</dd>
            ${tasksOf(w).length ? `<dt>設計項目</dt><dd>${tasksOf(w).map(esc).join("、")}</dd>` : ""}
            ${w.year ? `<dt>年份</dt><dd>${esc(w.year)}</dd>` : ""}
            ${w.award ? `<dt>獲獎</dt><dd>${esc(w.award)}</dd>` : ""}
          </dl>
        </div>
        <div class="work-desc">${paras(w.description)}</div>
      </div>
      ${body}
      <nav class="pager" aria-label="其他作品">
        <span>${prev ? `<a href="work?w=${encodeURIComponent(prev.slug)}">上一件：${esc(prev.title)}</a>` : ""}</span>
        <span>${next ? `<a href="work?w=${encodeURIComponent(next.slug)}">下一件：${esc(next.title)}</a>` : ""}</span>
      </nav>
    </article>`;
}

function services(site) {
  const list = site.services || [];
  const items = s => (s.items || []).length ? `<ul class="svc-items">${s.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
  const cta = s => s.link ? `<a class="pill svc-cta" href="${esc(s.link)}"${/^https?:/.test(s.link) ? ' target="_blank" rel="noopener"' : ""}>${esc(s.linkLabel || "了解更多")} →</a>` : "";
  main().innerHTML = `
    <h1 class="page-title">服務<span class="page-en" lang="en">Services</span></h1>
    ${site.servicesIntro ? `<p class="svc-intro">${inline(site.servicesIntro)}</p>` : ""}
    <section class="svc-list">${list.map(s => `
      <article class="svc-row">
        <div class="svc-head">
          ${s.icon ? `<img class="svc-icon" src="${esc(s.icon)}" alt="">` : ""}
          <h2 class="page-title svc-title">${esc(s.title)}${s.en ? `<span class="page-en" lang="en">${esc(s.en)}</span>` : ""}</h2>
        </div>
        <div class="svc-main">
          <p class="svc-desc">${inline(s.body || "")}</p>
          ${items(s)}
          ${cta(s)}
        </div>
      </article>`).join("")}</section>`;
}

function about(site) {
  const A = site.about;
  if (!A) { main().innerHTML = `<h1 class="page-title">關於<span class="page-en" lang="en">About</span></h1><div class="prose">${nl2p(site.intro)}</div>`; return; }
  const light = A.coverText === "白色";
  main().innerHTML = `
    <section class="about-cover${light ? " is-light" : ""}"${A.cover ? ` style="background-image:url('${esc(A.cover)}')"` : ""}>
      <div class="about-cover-text">
        ${A.eyebrow ? `<p class="about-eyebrow" lang="en">${esc(A.eyebrow)}</p>` : ""}
        <h1 class="about-title">${esc(A.title || "關於")}</h1>
      </div>
    </section>
    <section class="about-hero">
      <div class="about-head">
        <h2 class="page-title">關於<span class="page-en" lang="en">About</span></h2>
        ${A.lead ? `<p class="about-lead">${inline(A.lead)}</p>` : ""}
      </div>
      <div class="about-body">${paras(A.body || "")}</div>
    </section>
    ${(A.values || []).length ? `<section class="values">
      <h2 class="page-title">${esc(A.valuesHeading || "核心價值")}${A.valuesEn ? `<span class="page-en" lang="en">${esc(A.valuesEn)}</span>` : ""}</h2>
      ${A.valuesTitle ? `<p class="values-title">${esc(A.valuesTitle)}</p>` : ""}
      ${A.valuesIntro ? `<div class="values-intro">${paras(A.valuesIntro)}</div>` : ""}
      <div class="values-grid">${A.values.map(v => `
        <article class="value">
          ${v.icon ? `<img class="value-icon" src="${esc(v.icon)}" alt="">` : ""}
          <h3 class="value-title">${esc(v.title || "")}</h3>
          <div class="value-text">${paras(v.text || "")}</div>
        </article>`).join("")}</div>
    </section>` : ""}`;
}

function contact(site) {
  const rows = [
    ["Email", site.email && `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`],
    ["電話", site.phone && esc(site.phone)],
    ["地址", site.address && esc(site.address)],
    ["統一編號", site.taxId && esc(site.taxId)],
  ].filter(r => r[1]);
  const field = (name, label, ph, req, type = "text") => `
      <label class="f-row"><span class="f-label">${label}${req ? '<i aria-hidden="true">*</i>' : ""}</span>
        <input name="${name}" type="${type}" placeholder="${ph}"${req ? " required" : ""}></label>`;
  main().innerHTML = `
    <h1 class="page-title">聯絡<span class="page-en" lang="en">Contact</span></h1>
    <div class="contact-grid">
      <section class="contact-info">
        <div class="contact-intro">${paras(site.contactIntro || "")}</div>
        <dl class="info-list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
        ${site.line ? `<div class="line-box">
          ${site.lineQr ? `<img src="${esc(site.lineQr)}" alt="LINE QR code">` : ""}
          <div><p class="line-title">LINE 帳號</p><p class="line-note">手機掃描 QR code，或直接點按加入</p>
          <a class="pill" href="${esc(site.line)}" target="_blank" rel="noopener">加入好友</a></div></div>` : ""}
      </section>
      <form class="contact-form" novalidate>
        ${field("公司名稱", "公司名稱", "例如：台灣亞上有限公司", false)}
        ${field("name", "聯絡人名稱", "您的姓名", true)}
        ${field("email", "電子郵件", "name@company.com", true, "email")}
        ${field("電話號碼", "電話號碼", "0912-345-678", true, "tel")}
        <label class="f-row f-top"><span class="f-label">留言</span>
          <textarea name="留言" rows="7" placeholder="留下您想詢問的問題，例如需求項目、預計時程、預算範圍"></textarea></label>
        <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="f-row"><span></span><button class="submit" type="submit">送出</button></div>
        <div class="f-row"><span></span><p class="form-status" role="status" aria-live="polite"></p></div>
      </form>
    </div>
    ${(site.forms || []).length ? `<section class="req">
      <h2 class="b-heading">設計需求表</h2>
      <p class="req-intro">已經有明確的設計需求？填寫對應的需求表，我們能更快掌握規格並提供報價。</p>
      <div class="req-grid">${site.forms.map(f => `
        <a class="req-card${f.url ? "" : " is-soon"}" ${f.url ? `href="${esc(f.url)}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>
          <span class="req-title">${esc(f.title)}</span>
          <span class="req-desc">${esc(f.desc || "")}</span>
          <span class="req-go">${f.url ? "填寫需求表 →" : "準備中"}</span>
        </a>`).join("")}</div>
    </section>` : ""}`;

  // 表單送出：透過 Web3Forms 寄到網站資訊裡設定的信箱
  const form = main().querySelector(".contact-form");
  const status = form.querySelector(".form-status");
  const btn = form.querySelector(".submit");
  const say = (msg, kind) => { status.textContent = msg; status.className = "form-status " + (kind || ""); };
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const bad = [...form.querySelectorAll("[required]")].find(i => !i.value.trim() || !i.checkValidity());
    if (bad) { say(bad.type === "email" && bad.value ? "請確認電子郵件格式是否正確。" : "請填寫標示 * 的必填欄位。", "is-error"); bad.focus(); return; }
    if (!site.web3formsKey) { say("表單尚未設定收信金鑰，請改用 Email 或 LINE 與我們聯繫。", "is-error"); return; }
    const data = Object.fromEntries(new FormData(form));
    if (data.botcheck) return;
    delete data.botcheck;
    data.access_key = site.web3formsKey;
    data.subject = `AXON 官網聯絡表單｜${data["公司名稱"] || data.name}`;
    data.from_name = "AXON 官網";
    btn.disabled = true; btn.textContent = "送出中…"; say("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
      const out = await res.json();
      if (!out.success) throw new Error(out.message);
      form.reset();
      say("已收到您的訊息，我們會在 1–2 個工作天內與您聯繫，謝謝！", "is-ok");
    } catch (err) {
      say(`送出失敗，請稍後再試，或直接來信 ${site.email || ""}。`, "is-error");
    } finally {
      btn.disabled = false; btn.textContent = "送出";
    }
  });
}

load().catch(() => {
  main().innerHTML = `<p class="notice">內容載入失敗。若是在自己電腦上直接開檔案，請改用本機伺服器預覽（見 README）。</p>`;
});
