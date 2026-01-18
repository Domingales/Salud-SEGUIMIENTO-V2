/* assets/js/ui.js */
(function(global){
  const $ = (sel, root=document)=>root.querySelector(sel);

  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{})){
      if(k==="class") n.className = v;
      else if(k==="html") n.innerHTML = v;
      else if(k.startsWith("on") && typeof v==="function") n.addEventListener(k.slice(2).toLowerCase(), v);
      else if(v===true) n.setAttribute(k, k);
      else if(v===false || v==null) {}
      else n.setAttribute(k, String(v));
    }
    const list = Array.isArray(children) ? children : [children];
    for(const c of list){
      if(c==null) continue;
      if(typeof c==="string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    }
    return n;
  }

  function badge(text, tone){
    const cls = tone==="good" ? "badge good" : tone==="bad" ? "badge bad" : "badge warn";
    return el("span",{class:cls}, text);
  }

  function setPage(title, sub){
    $("#pageTitle").textContent = title || "";
    $("#pageSub").textContent = sub || "";
  }

  // Modal simple
  const modal = {
    root: $("#modal"),
    title: $("#modalTitle"),
    body: $("#modalBody"),
    actions: $("#modalActions"),
    closeBtn: $("#modalClose"),
    open({title, body, actions=[]}){
      modal.title.textContent = title || "";
      modal.body.innerHTML = "";
      modal.body.appendChild(body);
      modal.actions.innerHTML = "";
      actions.forEach(a=>modal.actions.appendChild(a));
      modal.root.classList.remove("hidden");
      modal.root.setAttribute("aria-hidden","false");
      // UX móvil: evitar que el fondo se desplace mientras el modal está abierto
      document.body.classList.add("modal-open");
    },
    close(){
      modal.root.classList.add("hidden");
      modal.root.setAttribute("aria-hidden","true");
      document.body.classList.remove("modal-open");
    }
  };

  modal.closeBtn.addEventListener("click", ()=>modal.close());
  modal.root.addEventListener("click", (e)=>{
    if(e.target && e.target.dataset && e.target.dataset.close) modal.close();
  });

  function toast(msg, ms=2600){
    const t = el("div",{class:"card", style:"position:fixed;right:16px;bottom:16px;max-width:520px;z-index:80;border-radius:14px;box-shadow:0 18px 55px rgba(0,0,0,.55);"});
    t.appendChild(el("div",{style:"font-weight:900;margin-bottom:4px"},"Aviso"));
    t.appendChild(el("div",{class:"small muted"}, msg));
    document.body.appendChild(t);
    setTimeout(()=>{ t.remove(); }, ms);
  }

  function applySettings(settings){
    const s = settings || StorageHub.defaultSettings();
    const theme = s.theme || {};
    const root = document.documentElement;
    const setVar = (name, val)=>root.style.setProperty(name, val);
    setVar("--bg", theme.bg || "#0b1220");
    setVar("--panel", theme.panel || "#111a2e");
    setVar("--card", theme.card || "#0f1830");
    setVar("--text", theme.text || "#e8eefc");
    setVar("--muted", theme.muted || "#9aa7c1");
    setVar("--primary", theme.primary || "#2f6bff");
    setVar("--success", theme.success || "#13b981");
    setVar("--danger", theme.danger || "#ff4d4f");
    setVar("--warning", theme.warning || "#f59e0b");

    const sidebar = $("#sidebar");
    sidebar.classList.toggle("right", s.sidebarPosition==="right");
  }

  global.UI = { $, el, badge, setPage, modal, toast, applySettings };
})(window);
