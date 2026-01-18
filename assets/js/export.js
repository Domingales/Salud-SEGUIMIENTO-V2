/* assets/js/export.js */
(function(global){
  function downloadText(filename, text, mime="text/plain"){
    const blob = new Blob([text], {type: mime+";charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  function toCSV(rows, delimiter=";"){
    const esc = (v)=>{
      const s = String(v ?? "");
      const needs = s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(delimiter);
      const t = s.replace(/"/g,'""');
      return needs ? `"${t}"` : t;
    };
    if(!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.map(esc).join(delimiter)];
    for(const r of rows){
      lines.push(headers.map(h=>esc(r[h])).join(delimiter));
    }
    return lines.join("\n");
  }

  function toTSV(rows){
    const esc = (v)=>String(v ?? "").replace(/\t/g," ").replace(/\r?\n/g," ");
    if(!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.map(esc).join("\t")];
    for(const r of rows){
      lines.push(headers.map(h=>esc(r[h])).join("\t"));
    }
    return lines.join("\n");
  }

  async function copyToClipboard(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(_){
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position="fixed"; ta.style.left="-9999px";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  function rowsForPatient(patient){
    const h = patient?.heightCm ?? "";
    const recs = (patient?.records||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    return recs.map(r=>{
      const bmi = HealthAnalysis.bmi(h, r.weight);
      return {
        Paciente: patient?.name || "",
        Sexo: patient?.sex || "",
        Edad: patient?.age ?? "",
        Altura_cm: h ?? "",
        Fecha: r.date ? new Date(r.date).toLocaleString("es-ES") : "",
        Peso_kg: r.weight ?? "",
        IMC: (bmi!=null ? bmi.toFixed(1).replace(".", ",") : ""),
        TA_Sistolica: r.bpSys ?? "",
        TA_Diastolica: r.bpDia ?? "",
        FC_lpm: r.hr ?? "",
        SpO2_pct: r.spo2 ?? "",
        Glucosa_mgdl: r.glucose ?? "",
        Glucosa_contexto: (r.glucoseContext || "unknown"),
        Medicacion: (patient?.medications || ""),
        Notas: (r.notes || "")
      };
    });
  }

  function reportText(patient, report){
    const lines = [];
    lines.push("INFORME RESUMEN - SALUD (orientativo)");
    lines.push("Paciente: " + (patient?.name||""));
    lines.push(`Edad: ${patient?.age ?? "—"}   Sexo: ${patient?.sex||"—"}   Altura: ${patient?.heightCm ?? "—"} cm`);
    if(patient?.medications) lines.push("Medicación (según paciente): " + patient.medications);
    lines.push("");
    if(report.missing?.length){
      lines.push("Faltan datos / avisos de calidad:");
      for(const s of report.missing) lines.push("- " + s);
      lines.push("");
    }
    lines.push("Estado actual:");
    lines.push(report.currentState);
    lines.push("");
    if(report.timeline && report.timeline.lines && report.timeline.lines.length){
      lines.push("Línea del estado de salud (historial completo):");
      if(report.timeline.overview) lines.push(report.timeline.overview);
      for(const s of report.timeline.lines) lines.push("- " + s);
      lines.push("");
    }
    lines.push("Mejoras detectadas (según registros):");
    for(const s of report.improvements) lines.push("- " + s);
    if(report.neutrals?.length){
      lines.push("");
      lines.push("Cambios neutrales / sin conclusión:");
      for(const s of report.neutrals) lines.push("- " + s);
    }
    lines.push("");
    lines.push("Empeoramientos detectados (si aplica):");
    for(const s of report.worsenings) lines.push("- " + s);
    lines.push("");
    lines.push("Consejos (basados en datos disponibles):");
    for(const s of report.advice) lines.push("- " + s);
    if(report.redFlags?.length){
      lines.push("");
      lines.push("Avisos importantes:");
      for(const s of report.redFlags) lines.push("! " + s);
    }
    lines.push("");
    lines.push("Nota: informe automatizado. No es un diagnóstico. Confirma con personal sanitario.");
    return lines.join("\n");
  }

  global.ExportHub = {
    downloadText,
    toCSV, toTSV,
    copyToClipboard,
    rowsForPatient,
    reportText
  };
})(window);
