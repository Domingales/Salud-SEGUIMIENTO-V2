/* assets/js/app.js */
(function(){
  const $ = UI.$;

  let state = {
    data: null,
    settings: StorageHub.loadSettings()
  };

  async function saveAll(){
    try{
      await StorageHub.saveData(state.data);
    }catch(e){
      UI.toast('Error guardando datos (almacenamiento). ' + (e?.message || e));
    }
    try{ StorageHub.saveSettings(state.settings); }catch(_){/* ajustes pequeños */}
    UI.applySettings(state.settings);
    renderStatus();
  }

  function renderStatus(){
    const nP = state.data.patients.length;
    const pid = state.data.selectedPatientId;
    const p = state.data.patients.find(x=>x.id===pid);
    const nR = p ? (p.records||[]).length : 0;
    $("#dataStatus").textContent = `Pacientes: ${nP} · Registros: ${nR} · Almacenamiento: localStorage`;
  }

  function ensureSelectedPatient(){
    if(state.data.selectedPatientId) return;
    if(state.data.patients.length) state.data.selectedPatientId = state.data.patients[0].id;
  }

  function getSelectedPatient(){
    const pid = state.data.selectedPatientId;
    return state.data.patients.find(p=>p.id===pid) || null;
  }

  function upsertPatientInSelect(){
    const sel = $("#patientSelect");
    sel.innerHTML = "";
    if(!state.data.patients.length){
      sel.appendChild(UI.el("option", {value:""}, "— Sin pacientes —"));
      sel.value = "";
      $("#btnEditPatient").disabled = true;
      $("#btnNewRecord").disabled = true;
      $("#btnReport").disabled = true;
      $("#btnExport").disabled = true;
      $("#btnQuickPrint").disabled = true;
      $("#btnQuickCopyExcel").disabled = true;
      return;
    }
    $("#btnEditPatient").disabled = false;
    $("#btnNewRecord").disabled = false;
    $("#btnReport").disabled = false;
    $("#btnExport").disabled = false;
    $("#btnQuickPrint").disabled = false;
    $("#btnQuickCopyExcel").disabled = false;

    for(const p of state.data.patients){
      const age = (p.age ?? "—");
      const sex = (p.sex || "—");
      const h = (p.heightCm!=null && p.heightCm!=="") ? `${p.heightCm} cm` : "altura —";
      const opt = UI.el("option",{value:p.id}, `${p.name} (${sex}, ${age} años, ${h})`);
      sel.appendChild(opt);
    }
    sel.value = state.data.selectedPatientId || state.data.patients[0].id;
  }

  function viewPanel(){
    const host = $("#viewPanel");
    host.innerHTML = "";
    const p = getSelectedPatient();
    if(!p){
      UI.setPage("Panel","Crea un paciente para empezar.");
      host.appendChild(UI.el("div",{class:"card"},[
        UI.el("div",{style:"font-weight:900;font-size:16px"},"Sin pacientes"),
        UI.el("div",{class:"note",style:"margin-top:8px"},"Pulsa “Añadir” para crear la primera ficha.")
      ]));
      return;
    }

    const last = HealthAnalysis.lastRecord(p);
    const sys = last ? Number(last.bpSys) : null;
    const dia = last ? Number(last.bpDia) : null;
    const hr  = last ? Number(last.hr) : null;
    const spo2 = last ? Number(last.spo2) : null;
    const weight = last ? Number(last.weight) : null;
    const bmi = HealthAnalysis.bmi(p.heightCm, weight);

    const bpEsc = HealthAnalysis.bpCategoryESC(Number.isFinite(sys)?sys:null, Number.isFinite(dia)?dia:null);
    const hrCat = HealthAnalysis.hrCategory(Number.isFinite(hr)?hr:null);
    const spCat = HealthAnalysis.spo2Category(Number.isFinite(spo2)?spo2:null);
    const bmiCat = HealthAnalysis.bmiCategory(bmi);

    UI.setPage("Ficha del paciente", "Últimos datos, tendencias y registros.");
    const header = UI.el("div",{class:"card"},[]);
    header.appendChild(UI.el("div",{class:"row space"},[
      UI.el("div",{},[
        UI.el("div",{style:"font-weight:950;font-size:16px"}, p.name),
        UI.el("div",{class:"muted small",style:"margin-top:4px"},
          `Edad: ${p.age ?? "—"} · Sexo: ${p.sex || "—"} · Altura: ${p.heightCm ?? "—"} cm · Registros: ${(p.records||[]).length}`
        ),
        p.medications ? UI.el("div",{class:"muted small",style:"margin-top:4px"}, `Medicación (según paciente): ${p.medications}`) : null
      ]),
      UI.el("div",{},[
        UI.el("div",{class:"pill"}, last ? `Último: ${HealthAnalysis.dateLabel(last.date)}` : "Sin registros")
      ])
    ]));

    const kpis = UI.el("div",{class:"kpis", style:"margin-top:12px"},[]);
    kpis.appendChild(kpi("Tensión (mmHg)", last ? `${HealthAnalysis.fmt0(sys)}/${HealthAnalysis.fmt0(dia)}` : "—", UI.badge(bpEsc.label, bpEsc.tone)));
    kpis.appendChild(kpi("Frecuencia (lpm)", last ? HealthAnalysis.fmt0(hr) : "—", UI.badge(hrCat.label, hrCat.tone)));
    kpis.appendChild(kpi("SpO₂ (%)", last && last.spo2!=null ? HealthAnalysis.fmt0(spo2) : "—", UI.badge(spCat.label, spCat.tone)));
    kpis.appendChild(kpi("IMC", bmi!=null ? HealthAnalysis.fmt1(bmi) : "—", UI.badge(bmiCat.label, bmiCat.tone)));

    header.appendChild(kpis);

    header.appendChild(UI.el("div",{class:"hr"}));
    header.appendChild(UI.el("div",{class:"note"},
      "Consejo técnico: mide la tensión en reposo, sentado, tras 5 minutos de calma; realiza 2-3 mediciones y registra el promedio. Para SpO₂, mide en reposo y con manos calientes."
    ));

    host.appendChild(header);
    host.appendChild(UI.el("div",{style:"height:12px"}));

    // Tabla de registros
    const recCard = UI.el("div",{class:"card"},[]);
    recCard.appendChild(UI.el("div",{class:"row space"},[
      UI.el("div",{style:"font-weight:900"},"Registros"),
      UI.el("div",{class:"row gap8"},[
        UI.el("button",{class:"btn btnSuccess", id:"btnAddRecordInline"},"Añadir"),
        UI.el("button",{class:"btn", id:"btnCopyExcelInline"},"Copiar Excel")
      ])
    ]));
    recCard.appendChild(UI.el("div",{class:"muted small", style:"margin-top:6px"}, "Ordenados de más reciente a más antiguo."));
    recCard.appendChild(UI.el("div",{class:"hr"}));

    const wrap = UI.el("div",{class:"tableWrap"});
    const table = UI.el("table");
    const thead = UI.el("thead");
    thead.appendChild(UI.el("tr",{},[
      UI.el("th",{},"Fecha"),
      UI.el("th",{},"Peso (kg)"),
      UI.el("th",{},"IMC"),
      UI.el("th",{},"TA (S/D)"),
      UI.el("th",{},"FC"),
      UI.el("th",{},"SpO₂"),
      UI.el("th",{},"Glucosa"),
      UI.el("th",{class:"tRight"},"Acciones")
    ]));
    table.appendChild(thead);

    const tbody = UI.el("tbody");
    const recs = HealthAnalysis.sortRecordsDesc(p.records||[]);
    if(!recs.length){
      tbody.appendChild(UI.el("tr",{},[
        UI.el("td",{colspan:"8", class:"muted"}, "Sin registros todavía. Pulsa “Añadir”.")
      ]));
    }else{
      for(const r of recs){
        const sys = Number(r.bpSys), dia = Number(r.bpDia);
        const bpEsc = HealthAnalysis.bpCategoryESC(Number.isFinite(sys)?sys:null, Number.isFinite(dia)?dia:null);
        const bmi = HealthAnalysis.bmi(p.heightCm, r.weight);
        const sp = (r.spo2==null ? null : Number(r.spo2));
        const g = (r.glucose==null ? null : Number(r.glucose));
        const gcat = HealthAnalysis.glucoseCategory(g, r.glucoseContext);
        const act = UI.el("div",{class:"row gap8", style:"justify-content:flex-end"},[
          UI.el("span",{class:"badge "+(bpEsc.tone==="good"?"good":bpEsc.tone==="bad"?"bad":"warn")}, bpEsc.label),
          UI.el("button",{class:"btn", "data-edit": r.id},"Editar"),
          UI.el("button",{class:"btn btnDanger", "data-del": r.id},"Eliminar")
        ]);
        tbody.appendChild(UI.el("tr",{},[
          UI.el("td",{}, new Date(r.date).toLocaleString("es-ES")),
          UI.el("td",{}, HealthAnalysis.fmt1(Number(r.weight))),
          UI.el("td",{}, bmi!=null ? HealthAnalysis.fmt1(bmi) : "—"),
          UI.el("td",{}, `${HealthAnalysis.fmt0(sys)}/${HealthAnalysis.fmt0(dia)}`),
          UI.el("td",{}, HealthAnalysis.fmt0(Number(r.hr))),
          UI.el("td",{}, sp!=null ? HealthAnalysis.fmt0(sp) : "—"),
          UI.el("td",{}, g!=null ? `${HealthAnalysis.fmt0(g)} (${r.glucoseContext||"unknown"}) · ${gcat.label}` : "—"),
          UI.el("td",{class:"tRight"}, act)
        ]));
      }
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    recCard.appendChild(wrap);

    host.appendChild(recCard);

    // Hook buttons
    $("#btnAddRecordInline").onclick = ()=>openRecordModal(p);
    $("#btnCopyExcelInline").onclick = ()=>copyExcel(p);
    tbody.querySelectorAll("button[data-edit]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-edit");
        const rec = (p.records||[]).find(x=>x.id===id);
        if(rec) openRecordModal(p, rec);
      });
    });

    tbody.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-del");
        confirmDeleteRecord(p, id);
      });
    });
  }

  function kpi(label, value, rightEl){
    const box = UI.el("div",{class:"kpi"});
    box.appendChild(UI.el("div",{class:"kpiLabel"}, label));
    box.appendChild(UI.el("div",{class:"kpiVal"}, value));
    box.appendChild(UI.el("div",{style:"margin-top:8px"}, rightEl));
    return box;
  }

  function openPatientModal(mode="add"){
    const isEdit = mode==="edit";
    const p = isEdit ? getSelectedPatient() : null;
    const body = UI.el("div",{},[]);
    body.appendChild(fieldRow("Nombre", UI.el("input",{class:"input", id:"pName", value: p?.name||"", placeholder:"Nombre y apellidos"})));
    body.appendChild(fieldRow("Edad", UI.el("input",{class:"input", id:"pAge", type:"number", min:"0", max:"120", value: p?.age ?? "", placeholder:"Años"})));
    const sexSel = UI.el("select",{class:"input", id:"pSex"});
    ["","Hombre","Mujer","Otro"].forEach(v=>sexSel.appendChild(UI.el("option",{value:v}, v||"—")));
    sexSel.value = p?.sex || "";
    body.appendChild(fieldRow("Sexo", sexSel));
    body.appendChild(fieldRow("Altura (cm)", UI.el("input",{class:"input", id:"pHeight", type:"number", min:"30", max:"250", value: p?.heightCm ?? "", placeholder:"Ej: 175"})));
    body.appendChild(fieldRow("Medicación (texto libre)", UI.el("input",{class:"input", id:"pMeds", value: p?.medications||"", placeholder:"Ej: Enalapril 10mg, Metformina..."})));

    const actions = [];
    actions.push(UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cancelar"));
    if(isEdit){
      actions.push(UI.el("button",{class:"btn btnDanger", onclick: ()=>confirmDeletePatient(p)},"Eliminar ficha"));
    }
    actions.push(UI.el("button",{class:"btn btnPrimary", onclick: ()=>{
      const name = $("#pName").value.trim();
      const age = Number($("#pAge").value);
      const sex = $("#pSex").value;
      const heightCmRaw = $("#pHeight").value;
      const heightCm = heightCmRaw==="" ? null : Number(heightCmRaw);
      const meds = $("#pMeds").value.trim();

      if(!name){ UI.toast("El nombre es obligatorio."); return; }
      if(!Number.isFinite(age) || age<0 || age>120){ UI.toast("Edad inválida."); return; }
      if(heightCmRaw!=="" && (!Number.isFinite(heightCm) || heightCm<30 || heightCm>250)){ UI.toast("Altura inválida."); return; }

      if(isEdit && p){
        p.name = name; p.age = age; p.sex = sex; p.heightCm = heightCm; p.medications = meds;
      }else{
        const np = { id: StorageHub.uid(), name, age, sex, heightCm, medications: meds, createdAt: StorageHub.nowISO(), records: [] };
        state.data.patients.push(np);
        state.data.selectedPatientId = np.id;
      }
      saveAll();
      upsertPatientInSelect();
      UI.modal.close();
      viewPanel();
    }}, isEdit ? "Guardar" : "Crear"));

    UI.modal.open({title: isEdit ? "Editar paciente" : "Añadir paciente", body, actions});
  }

  function confirmDeletePatient(p){
    if(!p) return;
    const body = UI.el("div",{},[
      UI.el("div",{style:"font-weight:900"}, "Eliminar ficha"),
      UI.el("div",{class:"note", style:"margin-top:8px"}, "Se eliminarán todos los registros del paciente. Esta acción no se puede deshacer.")
    ]);
    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cancelar"),
      UI.el("button",{class:"btn btnDanger", onclick: ()=>{
        state.data.patients = state.data.patients.filter(x=>x.id!==p.id);
        if(state.data.selectedPatientId===p.id) state.data.selectedPatientId = state.data.patients[0]?.id || null;
        saveAll();
        upsertPatientInSelect();
        UI.modal.close();
        viewPanel();
      }},"Eliminar definitivamente")
    ];
    UI.modal.open({title:"Confirmación", body, actions});
  }

  function fieldRow(label, inputEl){
    return UI.el("div",{style:"margin-bottom:10px"},[
      UI.el("div",{class:"label"}, label),
      inputEl
    ]);
  }

  function openRecordModal(patient, record){
    const isEdit = !!record;
    const p = patient || getSelectedPatient();
    if(!p) return;

    const body = UI.el("div",{},[]);

    // Fecha/hora (input local time)
    const dateInput = UI.el("input",{class:"input", type:"datetime-local"});
    const now = new Date();
    const pad = (n)=>String(n).padStart(2,"0");
    const toLocal = (d)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    dateInput.id = "rDate";
    dateInput.value = toLocal(now);
    body.appendChild(fieldRow("Fecha y hora", dateInput));

    // Inputs principales
    const weightInput = UI.el("input",{class:"input", type:"number", step:"0.1", min:"0", max:"400", placeholder:"Ej: 78,5"});
    weightInput.id="rWeight";
    const hrInput = UI.el("input",{class:"input", type:"number", step:"1", min:"20", max:"220", placeholder:"Ej: 72"});
    hrInput.id="rHR";

    body.appendChild(UI.el("div",{class:"grid2"},[
      UI.el("div",{},[ UI.el("div",{class:"label"},"Peso (kg)"), weightInput ]),
      UI.el("div",{},[ UI.el("div",{class:"label"},"Frecuencia cardiaca (lpm)"), hrInput ])
    ]));

    const sysInput = UI.el("input",{class:"input", type:"number", step:"1", min:"50", max:"260", placeholder:"Ej: 128"});
    sysInput.id="rSys";
    const diaInput = UI.el("input",{class:"input", type:"number", step:"1", min:"30", max:"160", placeholder:"Ej: 82"});
    diaInput.id="rDia";

    body.appendChild(UI.el("div",{class:"grid2", style:"margin-top:10px"},[
      UI.el("div",{},[ UI.el("div",{class:"label"},"Tensión A (Sistólica, mmHg)"), sysInput ]),
      UI.el("div",{},[ UI.el("div",{class:"label"},"Tensión B (Diastólica, mmHg)"), diaInput ])
    ]));

    const spo2Input = UI.el("input",{class:"input", type:"number", step:"1", min:"50", max:"100", placeholder:"Ej: 97"});
    spo2Input.id="rSpO2";
    const gluInput = UI.el("input",{class:"input", type:"number", step:"1", min:"20", max:"600", placeholder:"Ej: 95"});
    gluInput.id="rGlu";

    body.appendChild(UI.el("div",{class:"grid2", style:"margin-top:10px"},[
      UI.el("div",{},[ UI.el("div",{class:"label"},"SpO₂ (%) (opcional)"), spo2Input ]),
      UI.el("div",{},[ UI.el("div",{class:"label"},"Glucosa (mg/dL) (opcional)"), gluInput ])
    ]));

    const ctxSel = UI.el("select",{class:"input"});
    ctxSel.id="rGluCtx";
    [["unknown","Sin indicar"],["fasting","Ayunas (≥8h)"],["random","Casual/No ayunas"]].forEach(([v,l])=>ctxSel.appendChild(UI.el("option",{value:v}, l)));
    body.appendChild(fieldRow("Contexto de glucosa", ctxSel));

    const notesInput = UI.el("input",{class:"input", placeholder:"Síntomas, medición, contexto..."});
    notesInput.id="rNotes";
    body.appendChild(fieldRow("Notas (opcional)", notesInput));

    // Prefill en edición (usando referencias, no querySelector)
    if(isEdit){
      try{ dateInput.value = toLocal(new Date(record.date)); }catch(_){}
      weightInput.value = (record.weight ?? "");
      hrInput.value = (record.hr ?? "");
      sysInput.value = (record.bpSys ?? "");
      diaInput.value = (record.bpDia ?? "");
      spo2Input.value = (record.spo2==null ? "" : record.spo2);
      gluInput.value = (record.glucose==null ? "" : record.glucose);
      ctxSel.value = (record.glucoseContext || "unknown");
      notesInput.value = (record.notes || "");
    }

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cancelar"),
      UI.el("button",{class:"btn btnSuccess", onclick: ()=>{
        const dateVal = dateInput.value;
        const iso = dateVal ? new Date(dateVal).toISOString() : StorageHub.nowISO();

        const weight = Number(weightInput.value);
        const hr = Number(hrInput.value);
        const sys = Number(sysInput.value);
        const dia = Number(diaInput.value);

        const spRaw = spo2Input.value;
        const spo2 = spRaw==="" ? null : Number(spRaw);

        const gRaw = gluInput.value;
        const glucose = gRaw==="" ? null : Number(gRaw);
        const glucoseContext = ctxSel.value || "unknown";

        const notes = (notesInput.value || "").trim();

        const errs = [];
        if(!Number.isFinite(weight) || weight<=0 || weight>400) errs.push("Peso inválido.");
        if(!Number.isFinite(hr) || hr<20 || hr>220) errs.push("Frecuencia inválida.");
        if(!Number.isFinite(sys) || sys<50 || sys>260) errs.push("Sistólica inválida.");
        if(!Number.isFinite(dia) || dia<30 || dia>160) errs.push("Diastólica inválida.");
        if(Number.isFinite(sys) && Number.isFinite(dia) && dia >= sys) errs.push("La diastólica debe ser menor que la sistólica.");
        if(spRaw!=="" && (!Number.isFinite(spo2) || spo2<50 || spo2>100)) errs.push("SpO₂ inválida.");
        if(gRaw!=="" && (!Number.isFinite(glucose) || glucose<20 || glucose>600)) errs.push("Glucosa inválida.");

        if(errs.length){ UI.toast(errs.join(" ")); return; }

        // Guardar (nuevo o edición)
        if(isEdit){
          record.date = iso;
          record.weight = weight;
          record.hr = hr;
          record.bpSys = sys;
          record.bpDia = dia;
          record.spo2 = spo2;
          record.glucose = glucose;
          record.glucoseContext = glucoseContext;
          record.notes = notes;
        }else{
          p.records = p.records || [];
          p.records.push({
            id: "r_"+StorageHub.uid(),
            date: iso,
            weight, hr, bpSys: sys, bpDia: dia,
            spo2,
            glucose,
            glucoseContext,
            notes
          });
        }

        saveAll();
        UI.modal.close();
        viewPanel();
      }}, "Guardar")
    ];

    UI.modal.open({title:`${isEdit ? "Editar registro" : "Nuevo registro"} · ${p.name}`, body, actions});
  }

  function confirmDeleteRecord(patient, recordId){
    const p = patient;
    const body = UI.el("div",{},[
      UI.el("div",{style:"font-weight:900"}, "Eliminar registro"),
      UI.el("div",{class:"note", style:"margin-top:8px"}, "Se eliminará este registro. Esta acción no se puede deshacer.")
    ]);
    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cancelar"),
      UI.el("button",{class:"btn btnDanger", onclick: ()=>{
        p.records = (p.records||[]).filter(r=>r.id!==recordId);
        saveAll();
        UI.modal.close();
        viewPanel();
      }},"Eliminar")
    ];
    UI.modal.open({title:"Confirmación", body, actions});
  }

  function openReport(){
    const p = getSelectedPatient();
    if(!p){ UI.toast("No hay paciente seleccionado."); return; }
    if(!(p.records||[]).length){ UI.toast("El paciente no tiene registros."); return; }

    const report = HealthAnalysis.buildMedicalReport(p);
    const body = UI.el("div",{},[]);

    if(report.missing?.length){
      body.appendChild(UI.el("div",{class:"badge warn"},"Faltan datos o hay avisos"));
      body.appendChild(list(report.missing, true));
      body.appendChild(UI.el("div",{class:"hr"}));
    }

    body.appendChild(UI.el("div",{class:"badge "+(report.categories.bpESC.tone==="good"?"good":report.categories.bpESC.tone==="bad"?"bad":"warn")},
      `TA (ESC/ESH): ${report.categories.bpESC.label}`
    ));

    body.appendChild(UI.el("div",{style:"margin-top:10px; font-weight:900"},"Estado actual"));
    body.appendChild(UI.el("div",{class:"note", style:"margin-top:6px"}, report.currentState));

    // Línea del estado de salud: resume TODO el historial (no solo último/30 días)
    if(report.timeline){
      body.appendChild(UI.el("div",{class:"hr"}));
      body.appendChild(UI.el("div",{style:"font-weight:900"},"Línea del estado de salud (historial completo)"));
      body.appendChild(UI.el("div",{class:"note", style:"margin-top:6px"}, report.timeline.overview));
      body.appendChild(list(report.timeline.lines));
    }

    body.appendChild(UI.el("div",{class:"hr"}));

    body.appendChild(UI.el("div",{style:"font-weight:900"},"Mejoras detectadas (según registros)"));
    body.appendChild(list(report.improvements));

    if(report.neutrals?.length){
      body.appendChild(UI.el("div",{style:"font-weight:900; margin-top:12px"},"Cambios neutrales / sin conclusión"));
      body.appendChild(list(report.neutrals));
    }

    body.appendChild(UI.el("div",{style:"font-weight:900; margin-top:12px"},"Empeoramientos detectados (si aplica)"));
    body.appendChild(list(report.worsenings));

    body.appendChild(UI.el("div",{style:"font-weight:900; margin-top:12px"},"Consejos (basados en datos disponibles)"));
    body.appendChild(list(report.advice));

    if(report.redFlags?.length){
      body.appendChild(UI.el("div",{style:"font-weight:900; margin-top:12px"},"Avisos importantes"));
      body.appendChild(list(report.redFlags, true));
    }

    const stats = report.stats?.last30 || {};
    body.appendChild(UI.el("div",{class:"hr"}));
    body.appendChild(UI.el("div",{style:"font-weight:900"},"Estadísticas (últimos 30 días)"));
    body.appendChild(UI.el("div",{class:"note", style:"margin-top:6px"},
      `Registros: ${stats.count || 0}. Promedios: TA ${fmt(stats.avgSys)}/${fmt(stats.avgDia)} mmHg · FC ${fmt(stats.avgHr)} lpm · Peso ${fmt(stats.avgWeight)} kg · IMC ${fmt(stats.avgBmi)} · SpO₂ ${fmt(stats.avgSpo2)} % · Glucosa ${fmt(stats.avgGlucose)} mg/dL.`
    ));
    body.appendChild(UI.el("div",{class:"note", style:"margin-top:10px"},
      "Nota: informe automatizado. No es un diagnóstico. Si existe enfermedad previa, medicación o síntomas, interpreta los datos con un profesional."
    ));

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cerrar"),
      UI.el("button",{class:"btn", onclick: ()=>exportReportTXT(p, report)},"Exportar TXT"),
      UI.el("button",{class:"btn btnPrimary", onclick: ()=>{ UI.modal.close(); printPatient(p, report);} },"Imprimir")
    ];
    UI.modal.open({title:"Informe médico (resumen)", body, actions});
  }

  function fmt(n){
    if(!Number.isFinite(n)) return "—";
    return (Math.round(n*10)/10).toString().replace(".", ",");
  }

  function list(items, emphasis=false){
    const ul = UI.el("ul",{style:"margin:8px 0 0 18px; padding:0"});
    (items||[]).forEach(x=>{
      ul.appendChild(UI.el("li",{class:"note", style: emphasis ? "color:rgba(255,255,255,.92)" : ""}, x));
    });
    return ul;
  }

  function openExport(){
    const p = getSelectedPatient();
    if(!p){ UI.toast("No hay paciente seleccionado."); return; }

    const body = UI.el("div",{},[]);
    body.appendChild(UI.el("div",{class:"note"},
      "Puedes exportar el paciente seleccionado o toda la base de datos. Para Excel, se exporta un TSV (tabuladores) ideal para pegar."
    ));
    body.appendChild(UI.el("div",{class:"hr"}));

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cerrar"),
      UI.el("button",{class:"btn", onclick: ()=>exportPatientTXT(p)},"Paciente · TXT"),
      UI.el("button",{class:"btn", onclick: ()=>exportPatientCSV(p)},"Paciente · CSV"),
      UI.el("button",{class:"btn", onclick: ()=>copyExcel(p)},"Paciente · Copiar Excel"),
      UI.el("button",{class:"btn btnPrimary", onclick: ()=>exportAllJSON()},"Todo · Backup JSON")
    ];
    UI.modal.open({title:"Exportar", body, actions});
  }

  function exportPatientCSV(p){
    const rows = ExportHub.rowsForPatient(p);
    const csv = ExportHub.toCSV(rows, ";");
    ExportHub.downloadText(`${safeName(p.name)}_registros.csv`, csv, "text/csv");
  }

  function exportPatientTXT(p){
    const report = (p.records||[]).length ? HealthAnalysis.buildMedicalReport(p) : {currentState:"Sin registros.", improvements:[], worsenings:[], advice:[], redFlags:[], neutrals:[], missing:[]};
    const txt = ExportHub.reportText(p, report) + "\n\n" + recordsText(p);
    ExportHub.downloadText(`${safeName(p.name)}_informe.txt`, txt, "text/plain");
  }

  function exportReportTXT(p, report){
    const txt = ExportHub.reportText(p, report);
    ExportHub.downloadText(`${safeName(p.name)}_informe.txt`, txt, "text/plain");
  }

  function recordsText(p){
    const recs = HealthAnalysis.sortRecordsDesc(p.records||[]);
    const lines = [];
    lines.push("REGISTROS (más reciente primero)");
    for(const r of recs){
      const dt = new Date(r.date).toLocaleString("es-ES");
      const bmi = HealthAnalysis.bmi(p.heightCm, r.weight);
      const g = r.glucose!=null ? `${fmt(r.glucose)} mg/dL (${r.glucoseContext||"unknown"})` : "—";
      const sp = r.spo2!=null ? `${fmt(r.spo2)} %` : "—";
      lines.push(`- ${dt} · Peso ${fmt(r.weight)} kg · IMC ${bmi!=null ? fmt(bmi) : "—"} · TA ${fmt(r.bpSys)}/${fmt(r.bpDia)} mmHg · FC ${fmt(r.hr)} lpm · SpO₂ ${sp} · Glucosa ${g}${r.notes? " · Notas: "+r.notes:""}`);
    }
    return lines.join("\n");
  }

  async function copyExcel(p){
    const rows = ExportHub.rowsForPatient(p);
    const tsv = ExportHub.toTSV(rows);
    const ok = await ExportHub.copyToClipboard(tsv);
    UI.toast(ok ? "Copiado al portapapeles (formato Excel/TSV)." : "No se pudo copiar. Usa Exportar CSV.");
  }

  async function exportAllJSON(){
    const payload = await StorageHub.exportAll();
    ExportHub.downloadText(`salud_backup_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload,null,2), "application/json");
  }

  function openImport(){
    const body = UI.el("div",{},[]);
    body.appendChild(UI.el("div",{class:"note"},
      "Importa un archivo .json exportado por esta app. Sustituirá los datos actuales."
    ));
    const file = UI.el("input",{type:"file", accept:".json,application/json", class:"input", style:"margin-top:10px"});
    body.appendChild(file);

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cancelar"),
      UI.el("button",{class:"btn btnPrimary", onclick: async ()=>{
        const f = file.files?.[0];
        if(!f){ UI.toast("Selecciona un archivo JSON."); return; }
        const text = await f.text();
        try{
          const payload = JSON.parse(text);
          await StorageHub.importAll(payload);
          state.data = await StorageHub.loadData();
          state.settings = StorageHub.loadSettings();
          ensureSelectedPatient();
          saveAll();
          upsertPatientInSelect();
          UI.modal.close();
          viewPanel();
          UI.toast("Importación completada.");
        }catch(e){
          UI.toast("Error importando: " + (e?.message || e));
        }
      }},"Importar y sustituir")
    ];
    UI.modal.open({title:"Importar", body, actions});
  }

  function openSettings(){
    const s = state.settings;
    const body = UI.el("div",{},[]);
    const pos = UI.el("select",{class:"input", id:"sPos"});
    [["left","Izquierda"],["right","Derecha"]].forEach(([v,l])=>pos.appendChild(UI.el("option",{value:v},l)));
    pos.value = s.sidebarPosition || "left";
    body.appendChild(fieldRow("Panel de acciones", pos));
    body.appendChild(UI.el("div",{class:"hr"}));
    body.appendChild(UI.el("div",{class:"note"},"Colores (tema)"));

    const makeColor = (id, label, val)=>{
      const inp = UI.el("input",{class:"input", type:"color", id, value: val});
      return UI.el("div",{style:"margin-bottom:10px"},[
        UI.el("div",{class:"label"}, label),
        inp
      ]);
    };

    body.appendChild(UI.el("div",{class:"grid2"},[
      makeColor("cBg","Fondo", s.theme.bg),
      makeColor("cPanel","Panel", s.theme.panel),
      makeColor("cCard","Tarjetas", s.theme.card),
      makeColor("cText","Texto", s.theme.text),
      makeColor("cMuted","Texto secundario", s.theme.muted),
      makeColor("cPrimary","Primario", s.theme.primary),
      makeColor("cSuccess","Éxito", s.theme.success),
      makeColor("cDanger","Peligro", s.theme.danger),
      makeColor("cWarning","Aviso", s.theme.warning),
    ]));

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>{
        // Restaurar configuración original
        state.settings = StorageHub.defaultSettings();
        saveAll();
        UI.modal.close();
        viewPanel();
        UI.toast("Ajustes restaurados.");
      }},"Restaurar ajustes"),
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cancelar"),
      UI.el("button",{class:"btn btnPrimary", onclick: ()=>{
s.sidebarPosition = $("#sPos").value;
        s.theme.bg = $("#cBg").value;
        s.theme.panel = $("#cPanel").value;
        s.theme.card = $("#cCard").value;
        s.theme.text = $("#cText").value;
        s.theme.muted = $("#cMuted").value;
        s.theme.primary = $("#cPrimary").value;
        s.theme.success = $("#cSuccess").value;
        s.theme.danger = $("#cDanger").value;
        s.theme.warning = $("#cWarning").value;
        saveAll();
        UI.modal.close();
        viewPanel();
      
      }},"Guardar ajustes")
    ];
    UI.modal.open({title:"Ajustes", body, actions});
  }

  function safeName(s){
    return String(s||"paciente").trim().toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi,"_").replace(/^_+|_+$/g,"") || "paciente";
  }

  function printPatient(p, report){
    const rows = ExportHub.rowsForPatient(p);
    const table = buildHtmlTable(rows);
    const rep = ExportHub.reportText(p, report).replace(/\n/g,"<br/>");

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Informe - ${escapeHtml(p.name)}</title>
      <link rel="stylesheet" href="assets/css/print.css" />
      <style>
        body{font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#111}
        .doc{max-width:900px;margin:0 auto;padding:16px}
        h1{font-size:18px;margin:0 0 4px}
        .muted{color:#555;font-size:12px}
        .box{border:1px solid #ddd;border-radius:10px;padding:12px;margin-top:10px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left; vertical-align:top}
        th{background:#f5f5f5}
      </style>
    </head><body><div class="doc">
      <h1>Informe de salud (resumen orientativo)</h1>
      <div class="muted">Paciente: ${escapeHtml(p.name)} · Edad: ${escapeHtml(String(p.age??"—"))} · Sexo: ${escapeHtml(p.sex||"—")} · Altura: ${escapeHtml(String(p.heightCm??"—"))} cm · Generado: ${new Date().toLocaleString("es-ES")}</div>
      <div class="box">${rep}</div>
      <div class="box">
        <div style="font-weight:700;margin-bottom:6px">Registros</div>
        ${table}
      </div>
      <div class="muted" style="margin-top:12px">Nota: este informe es automatizado y no sustituye la valoración de un profesional sanitario.</div>
    </div></body></html>`;

    const w = window.open("","_blank");
    if(!w){ UI.toast("Ventana de impresión bloqueada."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(), 250);
  }

  function buildHtmlTable(rows){
    if(!rows.length) return "<div class='muted'>Sin registros</div>";
    const headers = Object.keys(rows[0]);
    const th = headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("");
    const trs = rows.map(r=>{
      const tds = headers.map(h=>`<td>${escapeHtml(String(r[h]??""))}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
    return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  
  function openGlossary(){
    const body = UI.el("div",{},[]);
    body.appendChild(UI.el("div",{class:"note"},"Selecciona un término para ver una explicación en lenguaje claro."));

    const sel = UI.el("select",{class:"input", id:"gTerm", style:"margin-top:10px"});
    const opts = Glossary.keys();
    sel.appendChild(UI.el("option",{value:""},"— Selecciona —"));
    opts.forEach(k=>sel.appendChild(UI.el("option",{value:k}, k)));
    body.appendChild(sel);

    const box = UI.el("div",{class:"card", style:"margin-top:12px; padding:12px"});
    const title = UI.el("div",{style:"font-weight:900"});
    const desc = UI.el("div",{class:"note", style:"margin-top:6px"});
    const why = UI.el("div",{class:"note", style:"margin-top:10px"});
    const what = UI.el("div",{class:"note", style:"margin-top:10px"});
    box.appendChild(title); box.appendChild(desc); box.appendChild(why); box.appendChild(what);
    body.appendChild(box);

    function renderTerm(){
      const t = sel.value;
      const it = Glossary.get(t);
      if(!it){
        title.textContent = "—";
        desc.textContent = "Elige un término.";
        why.textContent = "";
        what.textContent = "";
        return;
      }
      title.textContent = it.title || t;
      desc.textContent = it.desc || "";
      why.textContent = it.why ? ("Por qué importa: " + it.why) : "";
      what.textContent = it.what ? ("Qué hacer: " + it.what) : "";
    }
    sel.addEventListener("change", renderTerm);
    renderTerm();

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cerrar")
    ];
    UI.modal.open({title:"¿Qué es…? (Glosario)", body, actions});
  }


  function openChart(){
    const p = getSelectedPatient();
    if(!p){ UI.toast("No hay paciente seleccionado."); return; }
    if(!(p.records||[]).length){ UI.toast("El paciente no tiene registros."); return; }

    const body = UI.el("div",{},[]);
    body.appendChild(UI.el("div",{class:"note"},"Selecciona una métrica. Si un dato no está registrado, se considera desconocido y no se interpreta."));

    const sel = UI.el("select",{class:"input", id:"cMetric", style:"margin-top:10px"});
    const opts = [
      ["bp","Tensión arterial (Sistólica/Diastólica)"],
      ["weight","Peso"],
      ["bmi","IMC (requiere altura)"],
      ["hr","Frecuencia cardiaca"],
      ["spo2","SpO₂"],
      ["glucose","Glucosa"]
    ];
    opts.forEach(([v,l])=>sel.appendChild(UI.el("option",{value:v}, l)));
    body.appendChild(sel);

    const canvas = UI.el("canvas",{id:"cCanvas", style:"width:100%; height:340px; border-radius:12px; margin-top:12px; display:block;"});
    // tamaño real del canvas (para nitidez)
    canvas.width = 920;
    canvas.height = 380;

    body.appendChild(canvas);

    const legend = UI.el("div",{class:"note", style:"margin-top:10px"});
    body.appendChild(legend);

    function render(){
      const metric = sel.value;
      const res = ChartHub.render(canvas, p, metric, state.settings?.theme);
      if(metric==="bp"){
        legend.textContent = "Líneas: Sistólica y Diastólica (mmHg).";
      }else{
        legend.textContent = (res.series?.[0]?.name ? ("Serie: " + res.series[0].name) : "");
      }
    }
    sel.addEventListener("change", render);
    render();

    const actions = [
      UI.el("button",{class:"btn", onclick: ()=>UI.modal.close()},"Cerrar")
    ];
    UI.modal.open({title:`Gráfico · ${p.name}`, body, actions});
  }

function bindEvents(){
    $("#patientSelect").addEventListener("change", (e)=>{
      state.data.selectedPatientId = e.target.value || null;
      saveAll();
      viewPanel();
    });

    $("#btnAddPatient").addEventListener("click", ()=>openPatientModal("add"));
    $("#btnEditPatient").addEventListener("click", ()=>openPatientModal("edit"));

    $("#btnNewRecord").addEventListener("click", ()=>openRecordModal());
    $("#btnReport").addEventListener("click", ()=>openReport());
    $("#btnExport").addEventListener("click", ()=>openExport());
    $("#btnImport").addEventListener("click", ()=>openImport());
    $("#btnSettings").addEventListener("click", ()=>openSettings());
    $("#btnGlossary").addEventListener("click", ()=>openGlossary());
    $("#btnChart").addEventListener("click", ()=>openChart());

    $("#btnQuickPrint").addEventListener("click", ()=>{
      const p = getSelectedPatient();
      if(!p || !(p.records||[]).length){ UI.toast("No hay registros para imprimir."); return; }
      const report = HealthAnalysis.buildMedicalReport(p);
      printPatient(p, report);
    });

    $("#btnQuickCopyExcel").addEventListener("click", ()=>{
      const p = getSelectedPatient();
      if(!p || !(p.records||[]).length){ UI.toast("No hay registros para copiar."); return; }
      copyExcel(p);
    });
  }

  async function init(){
    UI.applySettings(state.settings);
    state.data = await StorageHub.loadData();
    ensureSelectedPatient();
    upsertPatientInSelect();
    bindEvents();
    viewPanel();
    renderStatus();
    await saveAll();
  }

  window.addEventListener("DOMContentLoaded", ()=>{ init().catch(e=>UI.toast("Error inicializando: "+(e?.message||e))); });
})();
