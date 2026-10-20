document.addEventListener("DOMContentLoaded", () => {
  const CFG = window.FROST || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- links from config.js ---------- */
  $$("[data-discord]").forEach((a) => { if (CFG.DISCORD_INVITE) a.href = CFG.DISCORD_INVITE; });
  $$("[data-ticket]").forEach((a) => { a.href = CFG.TICKET_URL || CFG.DISCORD_INVITE || "#"; });
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- toast ---------- */
  const toast = $("#toast");
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
  }

  /* ---------- mobile menu ---------- */
  const toggle = $(".menu-toggle");
  const nav = $("#site-nav");
  if (toggle && nav) {
    const setMenu = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- active nav link while scrolling ---------- */
  const navLinks = $$(".nav-links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); obs.unobserve(en.target); } });
    }, { threshold: 0.1 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- plan buttons: copy order message, then open the ticket link ---------- */
  $$("a[data-plan]").forEach((a) => {
    a.addEventListener("click", () => {
      const text = (CFG.ORDER_TEXT || "I want to buy the {plan} plan ({price}/month).")
        .replace("{plan}", a.dataset.plan)
        .replace("{price}", a.dataset.price);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => showToast("Order message copied. Paste it in your ticket."),
          () => showToast("Open a ticket and tell us you want the " + a.dataset.plan + " plan.")
        );
      } else {
        showToast("Open a ticket and tell us you want the " + a.dataset.plan + " plan.");
      }
    });
  });

  /* ---------- game panel demo ---------- */
  const status = $("#srv-status");
  const consoleEl = $("#srv-console");
  const players = $("#srv-players");
  const cpu = $("#srv-cpu");
  const ram = $("#srv-ram");
  const uptime = $("#srv-uptime");
  const actBtns = $$(".act");
  let state = "online";
  let busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function log(line) {
    if (!consoleEl) return;
    consoleEl.textContent += "\n" + line;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  function setState(next) {
    state = next;
    if (!status) return;
    status.dataset.state = next;
    $("em", status).textContent = next[0].toUpperCase() + next.slice(1);
  }
  function setStats(on) {
    players.textContent = on ? "12 / 100" : "0 / 100";
    cpu.textContent = on ? "23%" : "0%";
    ram.textContent = on ? "2.1 GB / 4 GB" : "0 GB / 4 GB";
    uptime.textContent = on ? "0d 0h 1m" : "-";
  }
  async function runAction(kind) {
    if (busy) return;
    if (kind === "start" && state === "online") return log("[Server] Already running.");
    if (kind === "stop" && state === "offline") return log("[Server] Already stopped.");
    busy = true;
    actBtns.forEach((b) => (b.disabled = true));
    if (kind !== "start") {
      log("[Server] Stopping...");
      await wait(700);
      setState("offline"); setStats(false);
      log("[Server] Server stopped.");
    }
    if (kind !== "stop") {
      setState("starting");
      log("[Server] Starting...");
      await wait(900);
      log("[Server] Loading worlds and plugins...");
      await wait(900);
      setState("online"); setStats(true);
      log("[Server] Done! Server is online.");
    }
    busy = false;
    actBtns.forEach((b) => (b.disabled = false));
  }
  actBtns.forEach((b) => b.addEventListener("click", () => runAction(b.dataset.act)));

  $$(".panel-side button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".panel-side button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      showToast("This is a demo preview. Your real panel has full " + b.textContent.replace(/^\S+\s/, "") + ".");
    });
  });

  /* ---------- plugin marketplace filter ---------- */
  const search = $("#plugin-search");
  const items = $$("#plugin-list li");
  const empty = $("#plugin-empty");
  let cat = "all";
  function filterPlugins() {
    const q = (search.value || "").trim().toLowerCase();
    let shown = 0;
    items.forEach((li) => {
      const okCat = cat === "all" || li.dataset.cat.split(" ").includes(cat);
      const okQ = !q || li.dataset.name.includes(q) || li.textContent.toLowerCase().includes(q);
      li.hidden = !(okCat && okQ);
      if (!li.hidden) shown++;
    });
    empty.hidden = shown !== 0;
  }
  if (search) search.addEventListener("input", filterPlugins);
  $$(".cat-chips button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".cat-chips button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      cat = b.dataset.cat;
      filterPlugins();
    });
  });
  $$(".install").forEach((b) => {
    b.addEventListener("click", () => {
      const done = b.classList.toggle("done");
      b.textContent = done ? "Installed ✓" : "Install";
      if (done) showToast("Demo: this is how plugin installs look in the panel.");
    });
  });

  /* ---------- add-on manager demo ---------- */
  const table = $(".addon-table");
  if (table) {
    table.addEventListener("change", (e) => {
      if (e.target.matches("input[type=checkbox]")) e.target.closest(".row").classList.toggle("off", !e.target.checked);
    });
    table.addEventListener("click", (e) => {
      const del = e.target.closest(".del");
      if (del) del.closest(".row").remove();
    });
  }
  const drop = $("#drop");
  const fileInput = $("#file-input");
  function addFiles(files) {
    Array.from(files).forEach((f) => {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (!["jar", "zip", "mcpack", "mcaddon"].includes(ext)) { showToast("Unsupported file type: ." + ext); return; }
      const type = ext === "jar" ? "Plugin" : ext === "zip" ? "Mod" : "Add-on";
      const row = document.createElement("div");
      row.className = "row"; row.setAttribute("role", "row");
      const name = document.createElement("span"); name.textContent = f.name;
      const kind = document.createElement("span"); kind.textContent = type;
      const label = document.createElement("label"); label.className = "switch";
      label.innerHTML = '<input type="checkbox" checked><i></i>';
      $("input", label).setAttribute("aria-label", "Toggle " + f.name);
      const del = document.createElement("button"); del.type = "button"; del.className = "del"; del.textContent = "✕";
      del.setAttribute("aria-label", "Remove " + f.name);
      row.append(name, kind, label, del);
      table.appendChild(row);
    });
  }
  if (drop && fileInput) {
    fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
  }
});
