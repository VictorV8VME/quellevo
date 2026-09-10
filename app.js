const SITE = { supabaseUrl: "https://kslhlktxlgtgoquhjhnz.supabase.co", supabaseKey: "sb_publishable_fV1Dv_25YI2BUwnT9AB0-w_aPtvpLUT" };

const CATEGORIES = ["carne", "bebida", "ensalada", "postre", "carbon", "otro"];
const CAT_LABEL = {
  carne: "Carne",
  bebida: "Bebida",
  ensalada: "Ensalada",
  postre: "Postre",
  carbon: "Carbón",
  otro: "Otro",
};
const TEMPLATES = {
  asado: [
    { label: "Carne / vacío", category: "carne" },
    { label: "Carbón", category: "carbon" },
    { label: "Ensalada", category: "ensalada" },
    { label: "Pan", category: "otro" },
    { label: "Bebidas", category: "bebida" },
    { label: "Postre", category: "postre" },
    { label: "Sal / chimichurri", category: "otro" },
  ],
  fiesta: [
    { label: "Bebidas", category: "bebida" },
    { label: "Hielo", category: "bebida" },
    { label: "Snacks", category: "otro" },
    { label: "Música", category: "otro" },
    { label: "Vasos", category: "otro" },
    { label: "Algo dulce", category: "postre" },
  ],
  cena: [
    { label: "Plato principal", category: "carne" },
    { label: "Guarnición", category: "otro" },
    { label: "Ensalada", category: "ensalada" },
    { label: "Pan", category: "otro" },
    { label: "Vino / bebida", category: "bebida" },
    { label: "Postre", category: "postre" },
  ],
  otro: [
    { label: "Traer algo", category: "otro" },
    { label: "Bebidas", category: "bebida" },
    { label: "Extra", category: "otro" },
  ],
};
const KIND_LABEL = { asado: "Asado", fiesta: "Fiesta", cena: "Cena", otro: "Otro" };
const KIND_SPONSOR = { carniceria: "Carnicería", super: "Súper", bebidas: "Bebidas", otro: "Comercio" };
const RSVP_LABEL = { voy: "Voy", talvez: "Tal vez", no: "No voy" };

const BIZ = {
  email: (window.QUELLEVO_CONFIG && window.QUELLEVO_CONFIG.bizEmail) || "victor11espindola@gmail.com",
  whatsapp: (window.QUELLEVO_CONFIG && window.QUELLEVO_CONFIG.bizWhatsApp) || "5493756000000",
};

const DEMO_SPONSORS = [
  {
    id: "demo-elcorte",
    name: "Carnicería El Corte",
    kind: "carniceria",
    promo_text: "10% en vacuno con código QUELLEV0",
    whatsapp: "5493756111111",
    url: null,
    city: "Paso de los Libres",
    active: true,
    pending: false,
    sort: 1,
    expires_at: null,
    demo: true,
  },
  {
    id: "demo-superlibres",
    name: "Super Libres",
    kind: "super",
    promo_text: "2x1 en gaseosas los sábados",
    whatsapp: null,
    url: "https://example.com/super-libres-demo",
    city: "Paso de los Libres",
    active: true,
    pending: false,
    sort: 2,
    expires_at: null,
    demo: true,
  },
  {
    id: "demo-puente",
    name: "Hielo & Carbón del Puente",
    kind: "bebidas",
    promo_text: "Combo hielo + carbón a precio fijo (demo)",
    whatsapp: "5493756222222",
    url: null,
    city: "Paso de los Libres",
    active: true,
    pending: false,
    sort: 3,
    expires_at: null,
    demo: true,
  },
];

const DEMO_ITEMS_DEFAULT = [
  { id: "d1", label: "🥩 Vacío", claimed_by: "Ana" },
  { id: "d2", label: "🥤 Bebidas", claimed_by: "Nico" },
  { id: "d3", label: "🥗 Ensalada", claimed_by: null },
];

const SPONSORS_VISIBLE = 2;
let kind = "asado", sb = null, online = false, eventRow = null, items = [];
let sponsors = DEMO_SPONSORS.slice();
let sponsorsExpanded = false;
let sponsorsCollapsed = false;
/** @type {Record<string, string>} name lower -> voy|talvez|no */
let rsvps = {};
let rsvpTableOk = false;
let guestsColOk = false;
let categoryColOk = true;
let closedColOk = true;
let toastTimer = null;
let demoItems = DEMO_ITEMS_DEFAULT.map((x) => Object.assign({}, x));
let namePromptTimer = null;

function el(id) { return document.getElementById(id); }
function codeGen() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
function myName() { return (el("guestName") && el("guestName").value || localStorage.getItem("ql_name") || "").trim(); }
function setMyName(n) {
  n = String(n || "").trim();
  if (el("guestName")) el("guestName").value = n;
  try { localStorage.setItem("ql_name", n); } catch (_) {}
}
function eventCodeFromUrl() {
  const q = new URLSearchParams(location.search);
  return (q.get("e") || q.get("c") || "").trim().toUpperCase();
}
function eventUrl(code) {
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("e", code);
  u.hash = "";
  return u.toString();
}
function absoluteAsset(path) {
  try {
    return new URL(path, location.href).toString();
  } catch (_) {
    return path;
  }
}
function fixShareMetaAbsolute() {
  // Absolute og:image helps WhatsApp previews
  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((m) => {
    const v = m.getAttribute("content") || "";
    if (v && !/^https?:/i.test(v)) m.setAttribute("content", absoluteAsset(v));
  });
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute("content", location.origin + location.pathname);
}
function showErr(msg) {
  const e = el("homeErr");
  if (!e) return;
  e.textContent = msg || "";
  e.classList.toggle("hidden", !msg);
}
function toast(msg) {
  const t = el("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
}
function promptName(reason) {
  const p = el("namePrompt");
  const card = el("nameCard");
  if (p) {
    p.textContent = reason || "Escribí tu nombre acá arriba para anotar qué llevás o confirmar si vas.";
    p.classList.remove("hidden");
    clearTimeout(namePromptTimer);
    namePromptTimer = setTimeout(() => p.classList.add("hidden"), 6000);
  }
  if (card) {
    card.classList.add("name-card-pulse");
    setTimeout(() => card.classList.remove("name-card-pulse"), 1200);
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (el("guestName")) el("guestName").focus();
}
function normCat(c) {
  const x = String(c || "otro").toLowerCase();
  return CATEGORIES.includes(x) ? x : "otro";
}
function isClosed(ev) {
  if (!ev) return false;
  if (ev.closed === true || ev.closed === "true" || ev.closed === 1) return true;
  if (String(ev.status || "").toLowerCase() === "closed") return true;
  return false;
}
function isHost() {
  if (!eventRow) return false;
  const n = myName().toLowerCase();
  const h = String(eventRow.host_name || "").trim().toLowerCase();
  if (h && n && h === n) return true;
  // After create, host name was set — also allow if we just created and name matches
  try {
    const flag = sessionStorage.getItem("ql_host_" + eventRow.code);
    if (flag === "1") return true;
  } catch (_) {}
  return false;
}
function markHost(code) {
  try { sessionStorage.setItem("ql_host_" + code, "1"); } catch (_) {}
}
function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  } catch (_) { return ""; }
}
function sponsorCta(s) {
  const parts = [];
  if (s.whatsapp) {
    const wa = String(s.whatsapp).replace(/\D/g, "");
    const msg = encodeURIComponent("Hola, vi la promo en QuéLlevo: " + (s.promo_text || ""));
    parts.push('<a class="btn btn-sm" href="https://wa.me/' + wa + '?text=' + msg + '" target="_blank" rel="noopener">WhatsApp</a>');
  }
  if (s.url) {
    parts.push('<a class="btn btn-ghost btn-sm" href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">Ver</a>');
  }
  return parts.join("") || "";
}
function activeSponsors(list) {
  const now = Date.now();
  return (list || []).filter((s) => {
    if (s.active === false) return false;
    if (s.pending === true && !s.demo) return false;
    if (s.expires_at) {
      try { if (new Date(s.expires_at).getTime() < now) return false; } catch (_) {}
    }
    return true;
  }).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

/* ---- Interactive landing demo ---- */
function renderDemo() {
  const root = el("demoList");
  if (!root) return;
  root.innerHTML = demoItems.map((it) => {
    const claimed = !!(it.claimed_by && String(it.claimed_by).trim());
    const mine = claimed && it.claimed_by === "Vos";
    let btn = "";
    if (!claimed) {
      btn = '<button class="btn btn-sm" type="button" data-demo-claim="' + escapeHtml(it.id) + '">Yo llevo</button>';
    } else if (mine) {
      btn = '<button class="btn btn-ghost btn-sm" type="button" data-demo-unclaim="' + escapeHtml(it.id) + '">Soltar</button>';
    } else {
      btn = '<span class="badge">ocupado</span>';
    }
    return (
      '<div class="demo-row">' +
        '<span>' + escapeHtml(it.label) + '</span>' +
        '<span class="demo-right">' +
          (claimed
            ? '<span class="who">Lleva: ' + escapeHtml(it.claimed_by) + '</span>'
            : '<span class="badge free">libre</span>') +
          " " + btn +
        "</span>" +
      "</div>"
    );
  }).join("");
  root.querySelectorAll("[data-demo-claim]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-demo-claim");
      const it = demoItems.find((x) => x.id === id);
      if (it && !it.claimed_by) {
        it.claimed_by = "Vos";
        renderDemo();
        toast("Demo: anotaste “" + it.label + "” (solo acá)");
      }
    });
  });
  root.querySelectorAll("[data-demo-unclaim]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-demo-unclaim");
      const it = demoItems.find((x) => x.id === id);
      if (it) {
        it.claimed_by = null;
        renderDemo();
        toast("Demo: soltaste el ítem");
      }
    });
  });
}

async function loadSponsors() {
  sponsors = DEMO_SPONSORS.slice();
  if (sb) {
    try {
      let data = null, error = null;
      ({ data, error } = await sb.from("quellevo_sponsors")
        .select("id,name,kind,promo_text,whatsapp,url,city,active,sort,expires_at,pending")
        .eq("active", true)
        .order("sort", { ascending: true }));
      if (error) {
        ({ data, error } = await sb.from("quellevo_sponsors")
          .select("id,name,kind,promo_text,whatsapp,url,city,active,sort,expires_at")
          .eq("active", true)
          .order("sort", { ascending: true }));
      }
      if (!error && data && data.length) {
        sponsors = data.map((row) => Object.assign({ demo: false, pending: false }, row));
      }
    } catch (_) { /* keep demo */ }
  }
  renderSponsors();
}

function renderSponsors() {
  const listEl = el("sponsorsList");
  const moreBtn = el("sponsorsMore");
  const hint = el("sponsorsDemoHint");
  const body = el("sponsorsBody");
  const toggle = el("sponsorsToggle");
  const biz = el("sponsorsBizLink");
  if (!listEl) return;
  if (biz) biz.href = "?biz=1";
  const list = activeSponsors(sponsors);
  const allDemo = list.length && list.every((s) => s.demo);
  if (hint) hint.classList.toggle("hidden", !allDemo);
  body.classList.toggle("collapsed", sponsorsCollapsed);
  toggle.setAttribute("aria-expanded", sponsorsCollapsed ? "false" : "true");
  toggle.textContent = sponsorsCollapsed ? "▸" : "▾";
  if (!list.length) {
    listEl.innerHTML = "<p class='muted'>Pronto habrá ofertas de comercios locales.</p>";
    moreBtn.classList.add("hidden");
    return;
  }
  const visible = sponsorsExpanded ? list : list.slice(0, SPONSORS_VISIBLE);
  listEl.innerHTML = visible.map((s) => {
    const kindLabel = KIND_SPONSOR[s.kind] || s.kind || "Comercio";
    const badge = s.demo
      ? '<span class="badge promo">Demo</span>'
      : '<span class="badge promo">Promo</span>';
    return (
      '<div class="sponsor-card">' +
        '<div class="sponsor-top">' +
          '<div><div class="sponsor-name">' + escapeHtml(s.name) + '</div>' +
          '<div class="sponsor-kind">' + escapeHtml(kindLabel) + (s.city ? " · " + escapeHtml(s.city) : "") + '</div></div>' +
          badge +
        '</div>' +
        '<div class="sponsor-promo">' + escapeHtml(s.promo_text) + '</div>' +
        '<div class="sponsor-cta">' + sponsorCta(s) + '</div>' +
      '</div>'
    );
  }).join("");
  const hasMore = list.length > SPONSORS_VISIBLE;
  moreBtn.classList.toggle("hidden", !hasMore);
  moreBtn.textContent = sponsorsExpanded ? "Ver menos" : ("Ver más (" + (list.length - SPONSORS_VISIBLE) + ")");
}

async function initSb() {
  try {
    const url = (window.QUELLEVO_CONFIG && window.QUELLEVO_CONFIG.supabaseUrl) || SITE.supabaseUrl;
    const key = (window.QUELLEVO_CONFIG && window.QUELLEVO_CONFIG.supabaseAnonKey) || SITE.supabaseKey;
    if (!window.supabase || !url || !key) return false;
    sb = window.supabase.createClient(url, key);
    const { error } = await sb.from("quellevo_events").select("id").limit(1);
    if (error) {
      online = false;
      if (el("homeHint")) {
        el("homeHint").textContent = "Modo local (este celular). Para sincronizar entre celulares, corré el SQL en Supabase una vez.";
      }
      return false;
    }
    online = true;
    if (el("homeHint")) el("homeHint").textContent = "Gratis · sin cuenta · link para el grupo (sync online)";
    try {
      const { error: eCat } = await sb.from("quellevo_items").select("category").limit(1);
      categoryColOk = !eCat;
    } catch (_) { categoryColOk = false; }
    try {
      const { error: eR } = await sb.from("quellevo_rsvps").select("id").limit(1);
      rsvpTableOk = !eR;
    } catch (_) { rsvpTableOk = false; }
    try {
      const { error: eG } = await sb.from("quellevo_events").select("guests").limit(1);
      guestsColOk = !eG;
    } catch (_) { guestsColOk = false; }
    try {
      const { error: eC } = await sb.from("quellevo_events").select("closed").limit(1);
      closedColOk = !eC;
    } catch (_) { closedColOk = false; }
    return true;
  } catch (e) {
    online = false;
    return false;
  }
}

function localSave() {
  if (!eventRow) return;
  try {
    localStorage.setItem("ql_event_" + eventRow.code, JSON.stringify({ event: eventRow, items, rsvps }));
  } catch (_) {}
}
function localLoad(code) {
  try { return JSON.parse(localStorage.getItem("ql_event_" + code) || "null"); } catch (_) { return null; }
}
function localRsvpKey(code) { return "ql_rsvp_" + code; }
function loadLocalRsvps(code) {
  try {
    const raw = JSON.parse(localStorage.getItem(localRsvpKey(code)) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch (_) { return {}; }
}
function saveLocalRsvps(code, map) {
  try { localStorage.setItem(localRsvpKey(code), JSON.stringify(map || {})); } catch (_) {}
}

async function createEvent() {
  showErr("");
  const title = (el("title").value || "").trim() || (KIND_LABEL[kind] + " juntos");
  const host = (el("host").value || "").trim() || "Anfitrión";
  const place = (el("place").value || "").trim();
  const when = el("when").value ? new Date(el("when").value).toISOString() : null;
  setMyName(host);
  const code = codeGen();
  const templates = TEMPLATES[kind] || TEMPLATES.otro;
  el("createBtn").disabled = true;
  try {
    if (online) {
      const payload = {
        code, title, kind, place: place || null, event_at: when, host_name: host,
      };
      if (closedColOk) payload.closed = false;
      const { data: ev, error } = await sb.from("quellevo_events").insert(payload).select("*").single();
      if (error) throw error;
      const rows = templates.map((t) => {
        const row = { event_id: ev.id, label: t.label };
        if (categoryColOk) row.category = t.category;
        return row;
      });
      const { data: its, error: e2 } = await sb.from("quellevo_items").insert(rows).select("*");
      if (e2) throw e2;
      eventRow = ev;
      if (eventRow.closed == null) eventRow.closed = false;
      items = (its || []).map((it) => Object.assign({ category: "otro" }, it));
      rsvps = {};
      markHost(code);
      await setRsvp("voy", host, true);
    } else {
      eventRow = {
        id: "local-" + code, code, title, kind, place, event_at: when,
        host_name: host, closed: false,
      };
      items = templates.map((t, i) => ({
        id: "li-" + i + "-" + code,
        event_id: eventRow.id,
        label: t.label,
        category: t.category,
        claimed_by: null,
      }));
      rsvps = {};
      rsvps[host.toLowerCase()] = "voy";
      saveLocalRsvps(code, rsvps);
      markHost(code);
      localSave();
    }
    history.replaceState(null, "", "?e=" + code);
    showViews("event");
    renderEvent(true);
    toast("¡Evento creado! Copiá el link o el código.");
    const box = el("shareBox");
    if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (e) {
    console.error(e);
    showErr("No se pudo crear. Si querés sync online, corré supabase-quellevo.sql en Supabase.");
  } finally {
    el("createBtn").disabled = false;
  }
}

function showMissing(code, msg) {
  showViews("missing");
  if (el("missingCode")) el("missingCode").textContent = code ? ("Código: " + code) : "";
  if (el("missingMsg")) {
    el("missingMsg").textContent = msg ||
      "El código o el link no existe, o solo está guardado en otro celular (modo local).";
  }
}

async function loadEvent(code) {
  code = String(code || "").trim().toUpperCase();
  if (!code) return;
  try {
    if (online) {
      const { data: ev, error } = await sb.from("quellevo_events").select("*").eq("code", code).maybeSingle();
      if (error) throw error;
      if (!ev) {
        showMissing(code, "No hay ningún evento con ese código. Revisá el link o pedile el código al anfitrión.");
        return;
      }
      const { data: its, error: e2 } = await sb.from("quellevo_items").select("*").eq("event_id", ev.id).order("created_at");
      if (e2) throw e2;
      eventRow = ev;
      if (eventRow.closed == null) eventRow.closed = false;
      items = (its || []).map((it) => Object.assign({ category: normCat(it.category) }, it));
      await loadRsvps();
    } else {
      const pack = localLoad(code);
      if (!pack) {
        showMissing(code, "En modo local solo ves eventos creados en este celular. Con internet, el mismo link se sincroniza entre celulares.");
        return;
      }
      eventRow = pack.event;
      if (eventRow.closed == null) eventRow.closed = false;
      items = (pack.items || []).map((it) => Object.assign({ category: normCat(it.category) }, it));
      rsvps = pack.rsvps || loadLocalRsvps(code);
    }
    showViews("event");
    renderEvent(false);
  } catch (e) {
    console.error(e);
    showMissing(code, "Hubo un error al cargar el evento. Probá de nuevo o creá uno nuevo.");
  }
}

async function loadRsvps() {
  if (!eventRow) { rsvps = {}; return; }
  const local = loadLocalRsvps(eventRow.code);
  rsvps = Object.assign({}, local);
  if (!online) return;
  if (rsvpTableOk) {
    try {
      const { data, error } = await sb.from("quellevo_rsvps").select("guest_name,status").eq("event_id", eventRow.id);
      if (!error && data) {
        data.forEach((r) => {
          if (r.guest_name && r.status) rsvps[String(r.guest_name).toLowerCase()] = r.status;
        });
      }
    } catch (_) {}
  } else if (guestsColOk && Array.isArray(eventRow.guests)) {
    eventRow.guests.forEach((g) => {
      if (g && g.name && g.status) rsvps[String(g.name).toLowerCase()] = g.status;
    });
  }
}

async function setRsvp(status, nameOverride, silent) {
  if (isClosed(eventRow) && !silent) {
    toast("Este evento ya está finalizado.");
    return;
  }
  const name = (nameOverride || myName()).trim();
  if (!name) {
    if (!silent) promptName("Escribí tu nombre para confirmar si vas.");
    return;
  }
  if (!eventRow) return;
  setMyName(name);
  const key = name.toLowerCase();
  rsvps[key] = status;
  saveLocalRsvps(eventRow.code, rsvps);
  localSave();
  renderRsvp();
  if (!online) {
    if (!silent) toast("Listo: " + (RSVP_LABEL[status] || status));
    return;
  }
  try {
    if (rsvpTableOk) {
      await sb.from("quellevo_rsvps").upsert(
        { event_id: eventRow.id, guest_name: name, status },
        { onConflict: "event_id,guest_name" }
      );
    } else if (guestsColOk) {
      const list = Object.keys(rsvps).map((k) => {
        const display = k === key ? name : k;
        return { name: display, status: rsvps[k] };
      });
      await sb.from("quellevo_events").update({ guests: list }).eq("id", eventRow.id);
    }
  } catch (e) { console.error(e); }
  if (!silent) toast("Listo: " + (RSVP_LABEL[status] || status));
}

function renderRsvp() {
  const summary = el("rsvpSummary");
  const mine = myName().toLowerCase();
  const closed = isClosed(eventRow);
  document.querySelectorAll(".rsvp-btn").forEach((b) => {
    const st = b.getAttribute("data-rsvp");
    b.classList.toggle("rsvp-on", !!(mine && rsvps[mine] === st));
    b.disabled = closed;
  });
  const counts = { voy: 0, talvez: 0, no: 0 };
  Object.values(rsvps).forEach((s) => { if (counts[s] != null) counts[s]++; });
  const parts = [];
  if (counts.voy) parts.push(counts.voy + " van");
  if (counts.talvez) parts.push(counts.talvez + " tal vez");
  if (counts.no) parts.push(counts.no + " no van");
  if (summary) summary.textContent = parts.length ? parts.join(" · ") : "Todavía nadie confirmó.";
}

function renderEvent(justCreated) {
  el("kindBadge").textContent = KIND_LABEL[eventRow.kind] || eventRow.kind;
  el("eventTitle").textContent = eventRow.title;
  const bits = [];
  if (eventRow.host_name) bits.push("Organiza " + eventRow.host_name);
  if (eventRow.place) bits.push(eventRow.place);
  if (eventRow.event_at) {
    try { bits.push(new Date(eventRow.event_at).toLocaleString("es-AR")); } catch (_) {}
  }
  el("eventMeta").textContent = bits.join(" · ") || "Sin fecha ni lugar todavía";
  el("eventCode").textContent = eventRow.code;
  const link = eventUrl(eventRow.code);
  if (el("shareLinkText")) el("shareLinkText").textContent = link;
  el("waShare").href = "https://wa.me/?text=" + encodeURIComponent(
    "QuéLlevo — " + eventRow.title + "\nAnotá qué llevás acá:\n" + link + "\n(También con el código " + eventRow.code + ")"
  );

  const closed = isClosed(eventRow);
  const banner = el("closedBanner");
  if (banner) banner.classList.toggle("hidden", !closed);
  const addBlock = el("addItemBlock");
  if (addBlock) addBlock.classList.toggle("hidden", closed);
  const hostTools = el("hostTools");
  if (hostTools) hostTools.classList.toggle("hidden", closed || !isHost());
  const editPanel = el("editPanel");
  if (editPanel && closed) editPanel.classList.add("hidden");
  const closeBtn = el("closeEventBtn");
  if (closeBtn) closeBtn.classList.toggle("hidden", closed);

  if (justCreated && el("shareBox")) {
    el("shareBox").classList.add("share-box-highlight");
  }

  renderItems();
  renderRsvp();
  loadSponsors();
}

function renderItems() {
  const root = el("itemList");
  if (!root) return;
  const closed = isClosed(eventRow);
  if (!items.length) {
    root.innerHTML = "<p class='muted'>Todavía no hay nada en la lista.</p>";
    return;
  }
  const byCat = {};
  CATEGORIES.forEach((c) => { byCat[c] = []; });
  items.forEach((it) => {
    const c = normCat(it.category);
    byCat[c].push(it);
  });
  let html = "";
  CATEGORIES.forEach((c) => {
    const list = byCat[c];
    if (!list.length) return;
    html += '<div class="cat-group"><div class="cat-title">' + escapeHtml(CAT_LABEL[c]) + "</div>";
    html += list.map((it) => {
      const claimed = !!(it.claimed_by && String(it.claimed_by).trim());
      const mine = claimed && myName() && it.claimed_by.trim().toLowerCase() === myName().toLowerCase();
      let btn = "";
      if (closed) {
        btn = claimed
          ? '<span class="badge">ocupado</span>'
          : '<span class="badge free">libre</span>';
      } else if (!claimed) {
        btn = '<button class="btn btn-sm" data-claim="' + escapeHtml(it.id) + '" type="button">Yo llevo</button>';
      } else if (mine) {
        btn = '<button class="btn btn-ghost btn-sm" data-unclaim="' + escapeHtml(it.id) + '" type="button">Soltar</button>';
      } else {
        btn = '<span class="badge">ocupado</span>';
      }
      return (
        '<div class="item"><div><div class="name">' + escapeHtml(it.label) + '</div><div class="who">' +
        (claimed ? ("Lleva: " + escapeHtml(it.claimed_by)) : (closed ? "" : "<span class='badge free'>libre</span>")) +
        "</div></div>" + btn + "</div>"
      );
    }).join("");
    html += "</div>";
  });
  root.innerHTML = html;
  root.querySelectorAll("[data-claim]").forEach((b) => b.addEventListener("click", () => claim(b.getAttribute("data-claim"))));
  root.querySelectorAll("[data-unclaim]").forEach((b) => b.addEventListener("click", () => unclaim(b.getAttribute("data-unclaim"))));
}

async function claim(id) {
  if (isClosed(eventRow)) { toast("Este evento ya está finalizado."); return; }
  const name = myName();
  if (!name) { promptName("Escribí tu nombre para anotar qué llevás."); return; }
  const it = items.find((x) => String(x.id) === String(id));
  if (!it || it.claimed_by) return;
  try {
    if (online) {
      const { error } = await sb.from("quellevo_items").update({ claimed_by: name }).eq("id", id).is("claimed_by", null);
      if (error) throw error;
      await refreshItems();
    } else {
      it.claimed_by = name;
      localSave();
      renderItems();
    }
  } catch (e) {
    console.error(e);
    toast("No se pudo anotar.");
    await refreshItems();
  }
}

async function unclaim(id) {
  if (isClosed(eventRow)) { toast("Este evento ya está finalizado."); return; }
  const it = items.find((x) => String(x.id) === String(id));
  if (!it) return;
  try {
    if (online) {
      const { error } = await sb.from("quellevo_items").update({ claimed_by: null }).eq("id", id);
      if (error) throw error;
      await refreshItems();
    } else {
      it.claimed_by = null;
      localSave();
      renderItems();
    }
  } catch (e) {
    console.error(e);
    toast("No se pudo soltar.");
  }
}

async function addItem() {
  if (isClosed(eventRow)) { toast("Este evento ya está finalizado."); return; }
  const label = (el("newItem").value || "").trim();
  if (!label || !eventRow) return;
  const category = normCat(el("newItemCat") && el("newItemCat").value);
  el("newItem").value = "";
  try {
    if (online) {
      const row = { event_id: eventRow.id, label };
      if (categoryColOk) row.category = category;
      const { error } = await sb.from("quellevo_items").insert(row);
      if (error) throw error;
      await refreshItems();
    } else {
      items.push({ id: "li-" + Date.now(), event_id: eventRow.id, label, category, claimed_by: null });
      localSave();
      renderItems();
    }
  } catch (e) {
    console.error(e);
    toast("No se pudo agregar.");
  }
}

async function refreshItems() {
  if (!online || !eventRow) return;
  const { data, error } = await sb.from("quellevo_items").select("*").eq("event_id", eventRow.id).order("created_at");
  if (!error) {
    items = (data || []).map((it) => Object.assign({ category: normCat(it.category) }, it));
    renderItems();
  }
}

async function saveEventEdit() {
  if (!eventRow || !isHost()) return;
  if (isClosed(eventRow)) { toast("Evento finalizado."); return; }
  const title = (el("editTitle").value || "").trim();
  const place = (el("editPlace").value || "").trim();
  const whenVal = el("editWhen").value;
  const when = whenVal ? new Date(whenVal).toISOString() : null;
  const err = el("editErr");
  if (err) { err.classList.add("hidden"); err.textContent = ""; }
  if (!title) {
    if (err) { err.textContent = "El título no puede quedar vacío."; err.classList.remove("hidden"); }
    return;
  }
  el("saveEditBtn").disabled = true;
  try {
    eventRow.title = title;
    eventRow.place = place || null;
    eventRow.event_at = when;
    if (online) {
      const { error } = await sb.from("quellevo_events").update({
        title,
        place: place || null,
        event_at: when,
      }).eq("id", eventRow.id);
      if (error) throw error;
    }
    localSave();
    el("editPanel").classList.add("hidden");
    renderEvent(false);
    toast("Evento actualizado");
  } catch (e) {
    console.error(e);
    if (err) { err.textContent = "No se pudo guardar."; err.classList.remove("hidden"); }
  } finally {
    el("saveEditBtn").disabled = false;
  }
}

async function closeEvent() {
  if (!eventRow || !isHost()) return;
  if (isClosed(eventRow)) return;
  const ok = confirm("¿Finalizar este evento? Nadie podrá agregar ni reclamar ítems.");
  if (!ok) return;
  try {
    eventRow.closed = true;
    if (online && closedColOk) {
      const { error } = await sb.from("quellevo_events").update({ closed: true }).eq("id", eventRow.id);
      if (error) throw error;
    } else if (online && !closedColOk) {
      // Column missing — still close locally; remind to run SQL
      toast("Cerrado acá. Para sync, agregá columna closed (SQL).");
    }
    localSave();
    renderEvent(false);
    toast("Evento finalizado");
  } catch (e) {
    console.error(e);
    toast("No se pudo finalizar online; quedó cerrado en este celular.");
    localSave();
    renderEvent(false);
  }
}

function showViews(which) {
  const landing = el("landingView");
  const eventV = el("eventView");
  const biz = el("bizView");
  const missing = el("missingView");
  const nav = el("miniNav");
  if (landing) landing.classList.toggle("hidden", which !== "landing");
  if (eventV) eventV.classList.toggle("hidden", which !== "event");
  if (biz) biz.classList.toggle("hidden", which !== "biz");
  if (missing) missing.classList.toggle("hidden", which !== "missing");
  if (nav) nav.classList.toggle("hidden", which === "event" || which === "biz" || which === "missing");
}

async function submitBiz() {
  const name = (el("bizName").value || "").trim();
  const kindVal = el("bizKind").value || "otro";
  const promo = (el("bizPromo").value || "").trim();
  const wa = (el("bizWa").value || "").trim();
  const city = (el("bizCity").value || "").trim() || "Paso de los Libres";
  const ok = el("bizOk");
  const err = el("bizErr");
  ok.classList.add("hidden");
  err.classList.add("hidden");
  if (!name || !promo) {
    err.textContent = "Completá nombre y promo.";
    err.classList.remove("hidden");
    return;
  }
  el("bizSubmit").disabled = true;
  const pendingMsg = "Quedó pendiente de aprobación; te avisamos por WhatsApp/email cuando esté activa.";
  try {
    if (online && sb) {
      const row = {
        name,
        kind: kindVal,
        promo_text: promo,
        whatsapp: wa || null,
        city,
        active: false,
        pending: true,
        sort: 200,
      };
      const { error } = await sb.from("quellevo_sponsors").insert(row);
      if (error) throw error;
      ok.textContent = pendingMsg;
      ok.classList.remove("hidden");
      toast("Oferta enviada · pendiente");
      el("bizName").value = "";
      el("bizPromo").value = "";
      el("bizWa").value = "";
    } else {
      throw new Error("offline");
    }
  } catch (e) {
    console.error(e);
    const subject = encodeURIComponent("QuéLlevo — oferta de " + name);
    const body = encodeURIComponent(
      "Nombre: " + name + "\nTipo: " + kindVal + "\nPromo: " + promo + "\nWhatsApp: " + wa + "\nCiudad: " + city + "\n"
    );
    err.textContent = "No se pudo guardar online. Te abrimos un mail… (queda pendiente de aprobación manual).";
    err.classList.remove("hidden");
    window.location.href = "mailto:" + BIZ.email + "?subject=" + subject + "&body=" + body;
  } finally {
    el("bizSubmit").disabled = false;
  }
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg || "Copiado");
  } catch (_) {
    prompt("Copiá:", text);
  }
}

// --- wire UI ---
el("kindChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  kind = b.getAttribute("data-kind");
  [...el("kindChips").children].forEach((c) => c.classList.toggle("on", c === b));
});
el("createBtn").addEventListener("click", createEvent);
el("addItem").addEventListener("click", addItem);
el("newItem").addEventListener("keydown", (e) => { if (e.key === "Enter") addItem(); });
el("guestName").addEventListener("change", () => {
  setMyName(el("guestName").value);
  const p = el("namePrompt");
  if (p && myName()) p.classList.add("hidden");
  renderItems();
  renderRsvp();
  // Re-eval host tools if name now matches
  if (eventRow) {
    const hostTools = el("hostTools");
    if (hostTools) hostTools.classList.toggle("hidden", isClosed(eventRow) || !isHost());
  }
});
el("guestName").addEventListener("input", () => {
  const p = el("namePrompt");
  if (p && (el("guestName").value || "").trim()) p.classList.add("hidden");
});
el("copyLink").addEventListener("click", () => {
  if (!eventRow) return;
  copyText(eventUrl(eventRow.code), "Link copiado");
});
el("copyCode").addEventListener("click", () => {
  if (!eventRow) return;
  copyText(eventRow.code, "Código copiado");
});
el("newEvent").addEventListener("click", () => {
  history.replaceState(null, "", location.pathname || "./");
  eventRow = null;
  items = [];
  rsvps = {};
  showViews("landing");
});
el("missingHome").addEventListener("click", () => {
  history.replaceState(null, "", location.pathname || "./");
  showViews("landing");
});
el("sponsorsToggle").addEventListener("click", () => {
  sponsorsCollapsed = !sponsorsCollapsed;
  renderSponsors();
});
el("sponsorsMore").addEventListener("click", () => {
  sponsorsExpanded = !sponsorsExpanded;
  renderSponsors();
});
el("rsvpButtons").addEventListener("click", (e) => {
  const b = e.target.closest("[data-rsvp]");
  if (!b) return;
  setRsvp(b.getAttribute("data-rsvp"));
});
el("bizSubmit").addEventListener("click", submitBiz);
el("brandHome").addEventListener("click", (e) => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname || "./");
  eventRow = null;
  items = [];
  showViews("landing");
});
el("termsLink").addEventListener("click", (e) => {
  e.preventDefault();
  toast("Términos: uso gratuito · el link es la llave · sin garantías MVP");
});
el("navCrear").addEventListener("click", () => {
  if (el("landingView").classList.contains("hidden")) {
    history.replaceState(null, "", location.pathname || "./");
    showViews("landing");
  }
  setTimeout(() => {
    const t = el("crear");
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
});
el("editEventBtn").addEventListener("click", () => {
  if (!eventRow || !isHost()) return;
  el("editTitle").value = eventRow.title || "";
  el("editPlace").value = eventRow.place || "";
  el("editWhen").value = toDatetimeLocalValue(eventRow.event_at);
  el("editPanel").classList.remove("hidden");
  el("editPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
});
el("cancelEditBtn").addEventListener("click", () => {
  el("editPanel").classList.add("hidden");
});
el("saveEditBtn").addEventListener("click", saveEventEdit);
el("closeEventBtn").addEventListener("click", closeEvent);
if (el("closedCta")) {
  el("closedCta").addEventListener("click", (e) => {
    e.preventDefault();
    history.replaceState(null, "", (location.pathname || "./") + "#crear");
    eventRow = null;
    items = [];
    showViews("landing");
    setTimeout(() => {
      const t = el("crear");
      if (t) t.scrollIntoView({ behavior: "smooth" });
    }, 50);
  });
}

(async function boot() {
  fixShareMetaAbsolute();
  const saved = localStorage.getItem("ql_name") || "";
  if (saved && el("guestName")) el("guestName").value = saved;
  if (saved && el("host")) el("host").value = saved;
  renderDemo();
  await initSb();
  const q = new URLSearchParams(location.search);
  if (q.get("biz") === "1") {
    showViews("biz");
    return;
  }
  const code = eventCodeFromUrl();
  if (code) {
    await loadEvent(code);
  } else {
    showViews("landing");
    if ((location.hash || "").toLowerCase() === "#negocios") {
      const n = el("negocios");
      if (n) setTimeout(() => n.scrollIntoView({ behavior: "smooth" }), 100);
    } else if ((location.hash || "").toLowerCase() === "#crear") {
      const t = el("crear");
      if (t) setTimeout(() => t.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }
})();
