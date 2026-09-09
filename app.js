
const SITE = { supabaseUrl: "https://kslhlktxlgtgoquhjhnz.supabase.co", supabaseKey: "sb_publishable_fV1Dv_25YI2BUwnT9AB0-w_aPtvpLUT" };
const TEMPLATES = {
  asado: ["Carne / vacío", "Carbón", "Ensalada", "Pan", "Bebidas", "Postre", "Sal / chimichurri"],
  fiesta: ["Bebidas", "Hielo", "Snacks", "Música", "Vasos", "Algo dulce"],
  cena: ["Plato principal", "Guarnición", "Ensalada", "Pan", "Vino / bebida", "Postre"],
  otro: ["Traer algo", "Bebidas", "Extra"],
};
const KIND_LABEL = { asado: "Asado", fiesta: "Fiesta", cena: "Cena", otro: "Otro" };
let kind = "asado", sb = null, online = false, eventRow = null, items = [];
function el(id) { return document.getElementById(id); }
function codeGen() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function myName() { return (el("guestName").value || localStorage.getItem("ql_name") || "").trim(); }
function setMyName(n) { el("guestName").value = n; try { localStorage.setItem("ql_name", n); } catch (_) {} }
function eventUrl(code) {
  const u = new URL(location.href);
  u.searchParams.set("e", code);
  u.hash = "";
  return u.toString();
}
function showErr(msg) {
  const e = el("homeErr");
  e.textContent = msg || "";
  e.classList.toggle("hidden", !msg);
}
async function initSb() {
  try {
    if (!window.supabase || !SITE.supabaseUrl || !SITE.supabaseKey) return false;
    sb = window.supabase.createClient(SITE.supabaseUrl, SITE.supabaseKey);
    const { error } = await sb.from("quellevo_events").select("id").limit(1);
    if (error) {
      online = false;
      el("homeHint").textContent = "Modo local (este celular). Para compartir entre varios, corré el SQL en Supabase una vez.";
      return false;
    }
    online = true;
    el("homeHint").textContent = "Gratis · sin cuenta · link para el grupo (sync online)";
    return true;
  } catch (e) { online = false; return false; }
}
function localSave() {
  if (!eventRow) return;
  try { localStorage.setItem("ql_event_" + eventRow.code, JSON.stringify({ event: eventRow, items })); } catch (_) {}
}
function localLoad(code) {
  try { return JSON.parse(localStorage.getItem("ql_event_" + code) || "null"); } catch (_) { return null; }
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
      const { data: ev, error } = await sb.from("quellevo_events").insert({
        code, title, kind, place: place || null, event_at: when, host_name: host,
      }).select("*").single();
      if (error) throw error;
      const rows = templates.map((label) => ({ event_id: ev.id, label }));
      const { data: its, error: e2 } = await sb.from("quellevo_items").insert(rows).select("*");
      if (e2) throw e2;
      eventRow = ev; items = its || [];
    } else {
      eventRow = { id: "local-" + code, code, title, kind, place, event_at: when, host_name: host };
      items = templates.map((label, i) => ({ id: "li-" + i + "-" + code, event_id: eventRow.id, label, claimed_by: null }));
      localSave();
    }
    history.replaceState(null, "", "?e=" + code);
    renderEvent();
  } catch (e) {
    console.error(e);
    showErr("No se pudo crear. Si querés sync online, corré supabase-quellevo.sql en Supabase.");
  } finally { el("createBtn").disabled = false; }
}
async function loadEvent(code) {
  code = String(code || "").trim().toUpperCase();
  if (!code) return;
  try {
    if (online) {
      const { data: ev, error } = await sb.from("quellevo_events").select("*").eq("code", code).maybeSingle();
      if (error) throw error;
      if (!ev) { showErr("No encontré ese evento."); return; }
      const { data: its, error: e2 } = await sb.from("quellevo_items").select("*").eq("event_id", ev.id).order("created_at");
      if (e2) throw e2;
      eventRow = ev; items = its || [];
    } else {
      const pack = localLoad(code);
      if (!pack) { showErr("En modo local solo ves eventos creados en este celular."); return; }
      eventRow = pack.event; items = pack.items || [];
    }
    renderEvent();
  } catch (e) { console.error(e); showErr("Error al cargar el evento."); }
}
function renderEvent() {
  el("homeView").classList.add("hidden");
  el("eventView").classList.remove("hidden");
  el("kindBadge").textContent = KIND_LABEL[eventRow.kind] || eventRow.kind;
  el("eventTitle").textContent = eventRow.title;
  const bits = [];
  if (eventRow.host_name) bits.push("Organiza " + eventRow.host_name);
  if (eventRow.place) bits.push(eventRow.place);
  if (eventRow.event_at) { try { bits.push(new Date(eventRow.event_at).toLocaleString("es-AR")); } catch (_) {} }
  el("eventMeta").textContent = bits.join(" · ");
  el("eventCode").textContent = eventRow.code;
  const link = eventUrl(eventRow.code);
  el("waShare").href = "https://wa.me/?text=" + encodeURIComponent("QuéLlevo — " + eventRow.title + "\nAnotá qué llevás:\n" + link);
  renderItems();
}
function renderItems() {
  const root = el("itemList");
  if (!items.length) { root.innerHTML = "<p class='muted'>Todavía no hay nada en la lista.</p>"; return; }
  root.innerHTML = items.map((it) => {
    const claimed = !!(it.claimed_by && String(it.claimed_by).trim());
    const mine = claimed && myName() && it.claimed_by.trim().toLowerCase() === myName().toLowerCase();
    let btn = "";
    if (!claimed) btn = '<button class="btn btn-sm" data-claim="' + escapeHtml(it.id) + '" type="button">Yo llevo</button>';
    else if (mine) btn = '<button class="btn btn-ghost btn-sm" data-unclaim="' + escapeHtml(it.id) + '" type="button">Soltar</button>';
    else btn = '<span class="badge">ocupado</span>';
    return '<div class="item"><div><div class="name">' + escapeHtml(it.label) + '</div><div class="who">' +
      (claimed ? ("Lleva: " + escapeHtml(it.claimed_by)) : "<span class='badge free'>libre</span>") +
      "</div></div>" + btn + "</div>";
  }).join("");
  root.querySelectorAll("[data-claim]").forEach((b) => b.addEventListener("click", () => claim(b.getAttribute("data-claim"))));
  root.querySelectorAll("[data-unclaim]").forEach((b) => b.addEventListener("click", () => unclaim(b.getAttribute("data-unclaim"))));
}
async function claim(id) {
  const name = myName();
  if (!name) { alert("Escribí tu nombre abajo para anotar."); el("guestName").focus(); return; }
  const it = items.find((x) => x.id === id);
  if (!it || it.claimed_by) return;
  try {
    if (online) {
      const { error } = await sb.from("quellevo_items").update({ claimed_by: name }).eq("id", id).is("claimed_by", null);
      if (error) throw error;
      await refreshItems();
    } else { it.claimed_by = name; localSave(); renderItems(); }
  } catch (e) { console.error(e); alert("No se pudo anotar."); await refreshItems(); }
}
async function unclaim(id) {
  const it = items.find((x) => x.id === id);
  if (!it) return;
  try {
    if (online) {
      const { error } = await sb.from("quellevo_items").update({ claimed_by: null }).eq("id", id);
      if (error) throw error;
      await refreshItems();
    } else { it.claimed_by = null; localSave(); renderItems(); }
  } catch (e) { console.error(e); alert("No se pudo soltar."); }
}
async function addItem() {
  const label = (el("newItem").value || "").trim();
  if (!label || !eventRow) return;
  el("newItem").value = "";
  try {
    if (online) {
      const { error } = await sb.from("quellevo_items").insert({ event_id: eventRow.id, label });
      if (error) throw error;
      await refreshItems();
    } else {
      items.push({ id: "li-" + Date.now(), event_id: eventRow.id, label, claimed_by: null });
      localSave(); renderItems();
    }
  } catch (e) { console.error(e); alert("No se pudo agregar."); }
}
async function refreshItems() {
  if (!online || !eventRow) return;
  const { data, error } = await sb.from("quellevo_items").select("*").eq("event_id", eventRow.id).order("created_at");
  if (!error) { items = data || []; renderItems(); }
}
el("kindChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  kind = b.getAttribute("data-kind");
  [...el("kindChips").children].forEach((c) => c.classList.toggle("on", c === b));
});
el("createBtn").addEventListener("click", createEvent);
el("addItem").addEventListener("click", addItem);
el("newItem").addEventListener("keydown", (e) => { if (e.key === "Enter") addItem(); });
el("guestName").addEventListener("change", () => { setMyName(el("guestName").value); renderItems(); });
el("copyLink").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(eventUrl(eventRow.code));
    el("shareOk").classList.remove("hidden");
    setTimeout(() => el("shareOk").classList.add("hidden"), 2000);
  } catch (_) { prompt("Copiá el link:", eventUrl(eventRow.code)); }
});
el("newEvent").addEventListener("click", () => {
  history.replaceState(null, "", location.pathname);
  eventRow = null; items = [];
  el("eventView").classList.add("hidden");
  el("homeView").classList.remove("hidden");
});
(async function boot() {
  const saved = localStorage.getItem("ql_name") || "";
  if (saved) el("guestName").value = saved;
  await initSb();
  const code = new URLSearchParams(location.search).get("e");
  if (code) await loadEvent(code);
})();
