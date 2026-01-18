/* assets/js/storage.js
   Almacenamiento robusto:
   - Datos clínicos en IndexedDB (evita el límite de cuota de localStorage).
   - Ajustes en localStorage (pequeños).
*/
(function(global){
  const DB_NAME = "salud_db_v1";
  const DB_VER  = 1;
  const STORE   = "kv";

  const KEY_DATA = "salud_pacientes_v3";   // clave dentro de IndexedDB (kv)
  const KEY_SETTINGS = "salud_ajustes_v2"; // ajustes siguen en localStorage

  function nowISO(){
    const d = new Date(); d.setSeconds(0,0);
    return d.toISOString();
  }

  function uid(){
    return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function safeParse(json, fallback){
    try{ return JSON.parse(json); }catch(_){ return fallback; }
  }

  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error || new Error("No se pudo abrir IndexedDB"));
    });
  }

  async function idbGet(key){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, "readonly");
      const st = tx.objectStore(STORE);
      const req = st.get(key);
      req.onsuccess = ()=>resolve(req.result ?? null);
      req.onerror = ()=>reject(req.error || new Error("Error leyendo IndexedDB"));
      tx.oncomplete = ()=>db.close();
    });
  }

  async function idbSet(key, value){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      const req = st.put(value, key);
      req.onsuccess = ()=>resolve(true);
      req.onerror = ()=>reject(req.error || new Error("Error escribiendo IndexedDB"));
      tx.oncomplete = ()=>db.close();
    });
  }

  function defaultData(){
    return { version: 3, createdAt: nowISO(), patients: [], selectedPatientId: null };
  }

  async function migrateIfNeeded(){
    // Migración desde v2 localStorage -> IndexedDB (solo si aún no hay datos en IDB)
    const existing = await idbGet(KEY_DATA);
    if(existing) return;

    const v2raw = localStorage.getItem("salud_pacientes_v2") || localStorage.getItem("salud_pacientes_v1");
    if(!v2raw) return;

    const data = safeParse(v2raw, null);
    if(!data || !Array.isArray(data.patients)) return;

    for(const p of data.patients){
      if(p.heightCm==null) p.heightCm = null;
      if(p.medications==null) p.medications = "";
      for(const r of (p.records||[])){
        if(r.spo2==null) r.spo2 = null;
        if(r.glucose==null) r.glucose = null;
        if(r.glucoseContext==null) r.glucoseContext = "unknown";
        if(r.notes==null) r.notes = "";
      }
    }
    data.version = 3;
    await idbSet(KEY_DATA, data);
    // No borramos automáticamente el v2 localStorage por seguridad.
  }

  async function loadData(){
    await migrateIfNeeded();
    const data = await idbGet(KEY_DATA);
    if(data && typeof data==="object" && Array.isArray(data.patients)) return data;
    const fresh = defaultData();
    await idbSet(KEY_DATA, fresh);
    return fresh;
  }

  async function saveData(data){
    await idbSet(KEY_DATA, data);
  }

  function defaultSettings(){
    return {
      sidebarPosition: "left",
      theme: {
        bg: "#0b1220",
        panel: "#111a2e",
        card: "#0f1830",
        text: "#e8eefc",
        muted: "#9aa7c1",
        primary: "#2f6bff",
        success: "#13b981",
        danger: "#ff4d4f",
        warning: "#f59e0b"
      }
    };
  }

  function loadSettings(){
    const raw = localStorage.getItem(KEY_SETTINGS);
    const s = safeParse(raw, null);
    if(s && typeof s === "object") return Object.assign(defaultSettings(), s);
    return defaultSettings();
  }

  function saveSettings(s){
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  }

  async function exportAll(){
    const data = await loadData();
    return { app:"Salud", exportedAt: nowISO(), data, settings: loadSettings() };
  }

  async function importAll(payload){
    if(!payload || typeof payload !== "object") throw new Error("Archivo inválido.");
    const data = payload.data;
    const settings = payload.settings;
    if(!data || !Array.isArray(data.patients)) throw new Error("No se detecta la estructura de pacientes.");
    await saveData(data);
    if(settings) saveSettings(Object.assign(defaultSettings(), settings));
  }

  global.StorageHub = {
    KEY_DATA, KEY_SETTINGS,
    nowISO, uid,
    loadData, saveData,              // async
    loadSettings, saveSettings,       // sync
    defaultSettings,
    exportAll, importAll              // async
  };
})(window);
