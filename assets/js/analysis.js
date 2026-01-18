/* assets/js/analysis.js */
(function(global){
  // IMPORTANTE:
  // - No se inventan datos: todo el informe se basa en valores registrados.
  // - Si faltan datos relevantes (p. ej. altura para IMC, contexto de glucosa, etc.), se avisará.

  function toNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function fmt1(n){
    if(n==null) return "—";
    return n.toFixed(1).replace(".", ",");
  }

  function fmt0(n){
    if(n==null) return "—";
    return Math.round(n).toString();
  }

  function dateLabel(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleDateString("es-ES");
    }catch(_){ return String(iso||""); }
  }

  function sortRecordsDesc(records){
    return (records||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  }

  function lastRecord(patient){
    const recs = sortRecordsDesc(patient?.records||[]);
    return recs[0] || null;
  }

  // ACC/AHA 2017 categories (office BP)
  function bpCategoryACC(sys, dia){
    if(sys==null || dia==null) return {key:"unknown", label:"Sin datos", tone:"warn"};
    if(sys >= 180 || dia >= 120) return {key:"crisis", label:"Crisis hipertensiva (consultar urgente si síntomas)", tone:"bad"};
    if(sys >= 140 || dia >= 90) return {key:"stage2", label:"Hipertensión (Etapa 2)", tone:"bad"};
    if((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return {key:"stage1", label:"Hipertensión (Etapa 1)", tone:"warn"};
    if(sys >= 120 && sys <= 129 && dia < 80) return {key:"elevated", label:"PA elevada", tone:"warn"};
    if(sys < 120 && dia < 80) return {key:"normal", label:"Normal", tone:"good"};
    return {key:"unknown", label:"Sin clasificar", tone:"warn"};
  }

  // ESC/ESH 2018 categories (office BP)
  function bpCategoryESC(sys, dia){
    if(sys==null || dia==null) return {key:"unknown", label:"Sin datos", tone:"warn"};
    if(sys < 120 && dia < 80) return {key:"optimal", label:"Óptima", tone:"good"};
    if(sys >= 120 && sys <= 129 && dia >= 80 && dia <= 84) return {key:"normal", label:"Normal", tone:"good"};
    if((sys >= 130 && sys <= 139) || (dia >= 85 && dia <= 89)) return {key:"high_normal", label:"Normal-alta", tone:"warn"};
    if((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) return {key:"grade1", label:"HTA grado 1", tone:"warn"};
    if((sys >= 160 && sys <= 179) || (dia >= 100 && dia <= 109)) return {key:"grade2", label:"HTA grado 2", tone:"bad"};
    if(sys >= 180 || dia >= 110) return {key:"grade3", label:"HTA grado 3", tone:"bad"};
    return {key:"unknown", label:"Sin clasificar", tone:"warn"};
  }

  function hrCategory(hr){
    if(hr==null) return {key:"unknown", label:"Sin datos", tone:"warn"};
    if(hr < 50) return {key:"low", label:"Baja (posible bradicardia; valorar contexto)", tone:"warn"};
    if(hr >= 50 && hr <= 100) return {key:"normal", label:"Normal", tone:"good"};
    if(hr > 100) return {key:"high", label:"Alta (posible taquicardia; valorar contexto)", tone:"warn"};
    return {key:"unknown", label:"Sin clasificar", tone:"warn"};
  }

  // SpO2 thresholds (general guidance)
  function spo2Category(spo2){
    if(spo2==null) return {key:"unknown", label:"Sin datos", tone:"warn"};
    if(spo2 >= 95) return {key:"normal", label:"Normal (≥95%)", tone:"good"};
    if(spo2 >= 92 && spo2 <= 94) return {key:"borderline", label:"Baja (92–94%)", tone:"warn"};
    if(spo2 <= 91) return {key:"low", label:"Muy baja (≤91%)", tone:"bad"};
    return {key:"unknown", label:"Sin clasificar", tone:"warn"};
  }

  // BMI
  function bmi(heightCm, weightKg){
    const h = toNum(heightCm);
    const w = toNum(weightKg);
    if(h==null || w==null || h<=0 || w<=0) return null;
    const m = h/100;
    return w/(m*m);
  }

  function bmiCategory(b){
    if(b==null) return {key:"unknown", label:"Sin datos", tone:"warn"};
    if(b < 18.5) return {key:"under", label:"Bajo peso (<18,5)", tone:"warn"};
    if(b < 25) return {key:"normal", label:"Normopeso (18,5–24,9)", tone:"good"};
    if(b < 30) return {key:"over", label:"Sobrepeso (25,0–29,9)", tone:"warn"};
    return {key:"obese", label:"Obesidad (≥30,0)", tone:"bad"};
  }

  // Glucose (mg/dL) - depends on context
  function glucoseCategory(glucose, context){
    const g = toNum(glucose);
    const ctx = context || "unknown";
    if(g==null) return {key:"unknown", label:"Sin datos", tone:"warn"};
    if(ctx==="fasting"){
      if(g < 100) return {key:"normal", label:"Ayunas: normal (<100)", tone:"good"};
      if(g <= 125) return {key:"predm", label:"Ayunas: rango prediabetes (100–125)", tone:"warn"};
      return {key:"dm", label:"Ayunas: compatible con diabetes (≥126)*", tone:"bad"};
    }
    if(ctx==="random"){
      if(g >= 200) return {key:"high", label:"Casual: muy alta (≥200)*", tone:"bad"};
      if(g >= 140) return {key:"elev", label:"Casual: elevada (≥140)", tone:"warn"};
      if(g >= 70) return {key:"ok", label:"Casual: dentro de rango habitual", tone:"good"};
      return {key:"low", label:"Casual: baja (<70)", tone:"warn"};
    }
    // Unknown context -> show neutral, warn in missing data list.
    if(g >= 200) return {key:"high", label:"Alta (≥200)*", tone:"bad"};
    if(g >= 140) return {key:"elev", label:"Elevada (≥140)", tone:"warn"};
    if(g >= 70) return {key:"ok", label:"Sin contexto: valor registrado", tone:"warn"};
    return {key:"low", label:"Baja (<70)", tone:"warn"};
  }

  function trend(a, b){
    if(a==null || b==null) return null;
    const d = b - a;
    if(Math.abs(d) < 0.01) return 0;
    return d;
  }

  function avg(arr){
    const xs = (arr||[]).filter(n=>Number.isFinite(n));
    if(!xs.length) return null;
    return xs.reduce((s,x)=>s+x,0)/xs.length;
  }

  function collectWindow(records, days){
    const now = new Date();
    const cut = new Date(now.getTime() - days*24*3600*1000);
    return (records||[]).filter(r=>{
      const d = new Date(r.date);
      return Number.isFinite(d.getTime()) && d >= cut && d <= now;
    });
  }



  // -------------------------
  // Análisis global (todos los registros)
  // -------------------------
  function sortRecordsAsc(records){
    return (records||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  }

  function safeDateMs(iso){
    try{
      const d = new Date(iso);
      const ms = d.getTime();
      return Number.isFinite(ms) ? ms : null;
    }catch(_){ return null; }
  }

  function linRegSlope(tDays, vals){
    // slope (units per day)
    const n = tDays.length;
    if(n < 2) return null;
    let sumT=0, sumY=0, sumTT=0, sumTY=0;
    for(let i=0;i<n;i++){
      const t = tDays[i], y = vals[i];
      sumT += t; sumY += y; sumTT += t*t; sumTY += t*y;
    }
    const denom = (n*sumTT - sumT*sumT);
    if(Math.abs(denom) < 1e-12) return null;
    return (n*sumTY - sumT*sumY) / denom;
  }

  function seriesFromRecords(records, getter){
    const pts = [];
    const recs = sortRecordsAsc(records||[]);
    for(const r of recs){
      const ms = safeDateMs(r.date);
      if(ms==null) continue;
      const v = getter(r);
      if(v==null) continue;
      pts.push({ms, v});
    }
    return pts;
  }

  function statsFromSeries(series, thresholdPer30){
    const pts = (series||[]).slice().sort((a,b)=>a.ms-b.ms);
    const n = pts.length;
    if(!n) return {n:0, min:null, max:null, avg:null, first:null, last:null, delta:null, slopePer30:null, trend:"Sin datos"};
    let minV=pts[0].v, maxV=pts[0].v, sum=0;
    for(const p of pts){
      if(p.v < minV) minV = p.v;
      if(p.v > maxV) maxV = p.v;
      sum += p.v;
    }
    const first = pts[0].v;
    const last = pts[n-1].v;
    const delta = (first!=null && last!=null) ? (last-first) : null;
    const avgV = sum / n;

    // regression slope
    const t0 = pts[0].ms;
    const tDays = [];
    const vals = [];
    for(const p of pts){
      tDays.push((p.ms - t0) / 86400000);
      vals.push(p.v);
    }
    const slopeDay = linRegSlope(tDays, vals);
    const slopePer30 = slopeDay==null ? null : slopeDay * 30;

    let trend = "Sin datos suficientes";
    if(slopePer30!=null && n>=2){
      const th = Number.isFinite(thresholdPer30) ? thresholdPer30 : 0;
      if(Math.abs(slopePer30) < th) trend = "Estable";
      else trend = slopePer30 > 0 ? "En ascenso" : "En descenso";
    }

    return {n, min:minV, max:maxV, avg:avgV, first, last, delta, slopePer30, trend};
  }

  function bpDistributionEsc(records){
    const dist = {optimal:0, normal:0, high_normal:0, grade1:0, grade2:0, grade3:0, unknown:0};
    const recs = records||[];
    for(const r of recs){
      const sys = toNum(r.bpSys);
      const dia = toNum(r.bpDia);
      const k = bpCategoryESC(sys, dia).key || "unknown";
      if(dist[k]==null) dist[k]=0;
      dist[k] += 1;
    }
    return dist;
  }

  function summarizeDistEsc(dist){
    const map = {
      optimal:"Óptima",
      normal:"Normal",
      high_normal:"Normal-alta",
      grade1:"HTA grado 1",
      grade2:"HTA grado 2",
      grade3:"HTA grado 3",
      unknown:"Sin clasificar"
    };
    const parts = [];
    for(const k of ["optimal","normal","high_normal","grade1","grade2","grade3","unknown"]){
      const v = dist[k]||0;
      if(v>0) parts.push(`${map[k]}: ${v}`);
    }
    return parts.length ? parts.join(" · ") : "Sin datos";
  }

  function buildTimelineSummary(patient){
    const recs = sortRecordsAsc(patient?.records||[]);
    const validDates = recs.map(r=>safeDateMs(r.date)).filter(ms=>ms!=null);
    const start = validDates.length ? new Date(Math.min(...validDates)) : null;
    const end = validDates.length ? new Date(Math.max(...validDates)) : null;
    const spanDays = (start && end) ? Math.max(0, Math.round((end.getTime()-start.getTime())/86400000)) : null;

    const period = (start && end) ? `${start.toLocaleDateString("es-ES")} → ${end.toLocaleDateString("es-ES")} (${recs.length} registros${spanDays!=null?`, ${spanDays} días`:""})` : `${recs.length} registros`;

    // series
    const sSys = seriesFromRecords(recs, r=>toNum(r.bpSys));
    const sDia = seriesFromRecords(recs, r=>toNum(r.bpDia));
    const sHr  = seriesFromRecords(recs, r=>toNum(r.hr));
    const sW   = seriesFromRecords(recs, r=>toNum(r.weight));
    const sSp  = seriesFromRecords(recs, r=>toNum(r.spo2));
    const sG   = seriesFromRecords(recs, r=>toNum(r.glucose));

    const hasHeight = patient?.heightCm!=null && String(patient.heightCm).trim()!=="";
    const sBmi = hasHeight ? seriesFromRecords(recs, r=>bmi(patient.heightCm, r.weight)) : [];

    // thresholds per 30 days for trend label (approx.)
    const stSys = statsFromSeries(sSys, 3);
    const stDia = statsFromSeries(sDia, 2);
    const stHr  = statsFromSeries(sHr, 3);
    const stW   = statsFromSeries(sW, 0.5);
    const stBmi = statsFromSeries(sBmi, 0.3);
    const stSp  = statsFromSeries(sSp, 0.5);
    const stG   = statsFromSeries(sG, 5);

    // BP distribution
    const distEsc = bpDistributionEsc(recs);

    // Event counts (solo con datos presentes)
    const bpCrisis = recs.filter(r=>{ const s=toNum(r.bpSys), d=toNum(r.bpDia); return s!=null && d!=null && (s>=180 || d>=120); }).length;
    const hrHigh = recs.filter(r=>{ const x=toNum(r.hr); return x!=null && x>100; }).length;
    const hrLow = recs.filter(r=>{ const x=toNum(r.hr); return x!=null && x<50; }).length;
    const spLow = recs.filter(r=>{ const x=toNum(r.spo2); return x!=null && x<=92; }).length;

    const gCtx = {fasting:0, random:0, unknown:0};
    for(const r of recs){
      if(r.glucose==null) continue;
      const ctx = (r.glucoseContext || "unknown");
      if(gCtx[ctx]==null) gCtx[ctx]=0;
      gCtx[ctx] += 1;
    }

    // Build clear lines (sin inventar, solo estadística descriptiva)
    const lines = [];
    lines.push(`Periodo analizado: ${period}.`);

    // TA
    if(stSys.n>=1 && stDia.n>=1){
      lines.push(
        `Tensión arterial (ESC/ESH): ${stSys.n} medidas. Media ${fmt0(stSys.avg)}/${fmt0(stDia.avg)} mmHg. Rango ${fmt0(stSys.min)}–${fmt0(stSys.max)}/${fmt0(stDia.min)}–${fmt0(stDia.max)}. `+
        `Tendencia global: Sistólica ${stSys.trend}${stSys.slopePer30!=null?` (~${fmt1(Math.abs(stSys.slopePer30))} mmHg/30d)`:""}; Diastólica ${stDia.trend}${stDia.slopePer30!=null?` (~${fmt1(Math.abs(stDia.slopePer30))} mmHg/30d)`:""}. `+
        `Distribución: ${summarizeDistEsc(distEsc)}.`+
        (bpCrisis?` Episodios de PA muy alta (≥180/≥120): ${bpCrisis}.`:"")
      );
    }else{
      lines.push("Tensión arterial: no hay suficientes registros con sistólica y diastólica para resumir la evolución.");
    }

    // FC
    if(stHr.n>=1){
      const extra = [];
      if(hrHigh) extra.push(`>100 lpm: ${hrHigh}`);
      if(hrLow) extra.push(`<50 lpm: ${hrLow}`);
      lines.push(
        `Frecuencia cardiaca: ${stHr.n} medidas. Media ${fmt0(stHr.avg)} lpm. Rango ${fmt0(stHr.min)}–${fmt0(stHr.max)}. Tendencia global: ${stHr.trend}${stHr.slopePer30!=null?` (~${fmt1(Math.abs(stHr.slopePer30))} lpm/30d)`:""}.`+
        (extra.length?` Observaciones: ${extra.join(" · ")}.`:"")
      );
    }else{
      lines.push("Frecuencia cardiaca: sin datos suficientes para resumir evolución.");
    }

    // Peso/IMC
    if(stW.n>=1){
      lines.push(
        `Peso: ${stW.n} medidas. Media ${fmt1(stW.avg)} kg. Rango ${fmt1(stW.min)}–${fmt1(stW.max)}. Tendencia global: ${stW.trend}${stW.slopePer30!=null?` (~${fmt1(Math.abs(stW.slopePer30))} kg/30d)`:""}.`+
        (stW.delta!=null?` Cambio neto: ${stW.delta>0?"+":""}${fmt1(stW.delta)} kg.`:"")
      );
    }else{
      lines.push("Peso: sin datos suficientes para resumir evolución.");
    }

    if(hasHeight){
      if(stBmi.n>=1){
        const cat = bmiCategory(stBmi.last);
        lines.push(
          `IMC (con altura ${fmt0(toNum(patient.heightCm))} cm): ${stBmi.n} valores calculables. Último IMC ${fmt1(stBmi.last)} (${cat.label}). Rango ${fmt1(stBmi.min)}–${fmt1(stBmi.max)}. Tendencia global: ${stBmi.trend}${stBmi.slopePer30!=null?` (~${fmt1(Math.abs(stBmi.slopePer30))} puntos/30d)`:""}.`
        );
      }else{
        lines.push("IMC: no hay suficientes datos (peso/altura) para calcular y resumir la evolución.");
      }
    }else{
      lines.push("IMC: falta altura en la ficha del paciente; no se calcula ni se interpreta.");
    }

    // SpO2
    if(stSp.n>=1){
      lines.push(
        `SpO₂: ${stSp.n} medidas. Media ${fmt0(stSp.avg)} %. Rango ${fmt0(stSp.min)}–${fmt0(stSp.max)}. Tendencia global: ${stSp.trend}${stSp.slopePer30!=null?` (~${fmt1(Math.abs(stSp.slopePer30))} %/30d)`:""}.`+
        (spLow?` Registros con SpO₂ ≤92%: ${spLow}.`:"")
      );
    }else{
      lines.push("SpO₂: sin datos registrados (o insuficientes) para resumir evolución.");
    }

    // Glucosa
    if(stG.n>=1){
      const ctxParts = [];
      if(gCtx.fasting) ctxParts.push(`Ayunas: ${gCtx.fasting}`);
      if(gCtx.random) ctxParts.push(`Casual: ${gCtx.random}`);
      if(gCtx.unknown) ctxParts.push(`Sin indicar: ${gCtx.unknown}`);

      lines.push(
        `Glucosa: ${stG.n} medidas registradas. Rango ${fmt0(stG.min)}–${fmt0(stG.max)} mg/dL. `+
        `Tendencia global: ${stG.trend}${stG.slopePer30!=null?` (~${fmt1(Math.abs(stG.slopePer30))} mg/dL/30d)`:""}. `+
        `Contextos: ${ctxParts.length?ctxParts.join(" · "):"—"}. `+
        (gCtx.unknown?"Nota: las mediciones sin contexto (ayunas/casual) no se interpretan clínicamente.":"")
      );
    }else{
      lines.push("Glucosa: sin datos registrados (o insuficientes) para resumir evolución.");
    }

    const overview = "Este apartado resume el historial completo mediante estadísticas descriptivas (medias, rangos y tendencias). No es un diagnóstico.";

    return {
      period,
      spanDays,
      counts: {
        records: recs.length,
        bpCrisis,
        hrHigh,
        hrLow,
        spLow,
        glucoseContexts: gCtx
      },
      bpDistributionESC: distEsc,
      seriesStats: { sys: stSys, dia: stDia, hr: stHr, weight: stW, bmi: stBmi, spo2: stSp, glucose: stG },
      overview,
      lines
    };
  }
  function buildMedicalReport(patient){
    const recs = sortRecordsDesc(patient?.records||[]);
    const latest = recs[0] || null;
    const earliest = recs[recs.length-1] || null;

    const missing = [];
    if(!latest) missing.push("No hay registros para evaluar el estado actual.");
    if(latest && (latest.bpSys==null || latest.bpDia==null)) missing.push("Faltan datos de tensión arterial (sistólica/diastólica) en el último registro.");
    if(latest && latest.hr==null) missing.push("Falta frecuencia cardiaca en el último registro.");
    if(latest && latest.weight==null) missing.push("Falta peso en el último registro.");
    if(patient && (patient.heightCm==null || patient.heightCm==="")) missing.push("Falta altura del paciente (necesaria para IMC).");
    if(latest && latest.glucose!=null && (latest.glucoseContext==null || latest.glucoseContext==="unknown")) missing.push("Se registró glucosa pero no se indicó si era en ayunas o casual (la interpretación cambia).");

    const sysL = toNum(latest?.bpSys), diaL = toNum(latest?.bpDia);
    const hrL = toNum(latest?.hr), wL = toNum(latest?.weight);
    const spL = toNum(latest?.spo2), gL = toNum(latest?.glucose);
    const bL = bmi(patient?.heightCm, wL);

    const sysE = toNum(earliest?.bpSys), diaE = toNum(earliest?.bpDia);
    const hrE = toNum(earliest?.hr), wE = toNum(earliest?.weight);
    const spE = toNum(earliest?.spo2), gE = toNum(earliest?.glucose);
    const bE = bmi(patient?.heightCm, wE);

    const bpAcc = bpCategoryACC(sysL, diaL);
    const bpEsc = bpCategoryESC(sysL, diaL);
    const hrCat = hrCategory(hrL);
    const spo2Cat = spo2Category(spL);
    const bmiCatL = bmiCategory(bL);
    const gluCat = glucoseCategory(gL, latest?.glucoseContext);

    const wTrend = trend(wE, wL);
    const sysTrend = trend(sysE, sysL);
    const diaTrend = trend(diaE, diaL);
    const hrTrend = trend(hrE, hrL);
    const spTrend = trend(spE, spL);
    const bTrend  = trend(bE, bL);

    const last30 = collectWindow(recs, 30);
    const avgSys30 = avg(last30.map(r=>toNum(r.bpSys)));
    const avgDia30 = avg(last30.map(r=>toNum(r.bpDia)));
    const avgHr30  = avg(last30.map(r=>toNum(r.hr)));
    const avgW30   = avg(last30.map(r=>toNum(r.weight)));
    const avgSp30  = avg(last30.map(r=>toNum(r.spo2)));
    const avgG30   = avg(last30.map(r=>toNum(r.glucose)));
    const avgB30   = bmi(patient?.heightCm, avgW30);

    const improvements = [];
    const worsenings = [];
    const neutrals = [];

    function addDelta(label, d, goodDir, minAbsForNotable=3){
      if(d==null) return;
      if(d===0){ neutrals.push(`${label}: sin cambios.`); return; }
      const abs = Math.abs(d);
      const magnitude = abs >= 10 ? "notable" : (abs >= minAbsForNotable ? "moderada" : "ligera");
      const sign = d > 0 ? "subida" : "bajada";
      const txt = `${label}: ${sign} ${magnitude} (${fmt1(abs)}).`;
      const isGood = (goodDir==="down") ? (d < 0) : (d > 0);
      (isGood ? improvements : worsenings).push(txt);
    }

    // BP: bajar suele ser mejora cuando estaba alta; aquí usamos dirección siempre "down" (si ya estaba óptima, se matiza en consejos).
    addDelta("Sistólica", sysTrend, "down");
    addDelta("Diastólica", diaTrend, "down");
    // HR: acercarse a rango normal (50-100) es mejor. Implementamos lógica contextual.
    if(hrE!=null && hrL!=null){
      const dist = (x)=> (x<50) ? (50-x) : (x>100) ? (x-100) : 0;
      const d0 = dist(hrE), d1 = dist(hrL);
      if(d1 < d0) improvements.push(`Frecuencia cardiaca: más cercana al rango habitual (50–100) (de ${fmt0(hrE)} a ${fmt0(hrL)}).`);
      else if(d1 > d0) worsenings.push(`Frecuencia cardiaca: más alejada del rango habitual (50–100) (de ${fmt0(hrE)} a ${fmt0(hrL)}).`);
      else neutrals.push("Frecuencia cardiaca: sin cambio relevante respecto al rango habitual.");
    }

    // BMI/Peso: depende de categoría
    if(bE!=null && bL!=null){
      const key = bmiCategory(bE).key; // base at earliest
      if(key==="over" || key==="obese"){
        if(bTrend!=null && bTrend < 0) improvements.push(`IMC: descenso (de ${fmt1(bE)} a ${fmt1(bL)}).`);
        else if(bTrend!=null && bTrend > 0) worsenings.push(`IMC: aumento (de ${fmt1(bE)} a ${fmt1(bL)}).`);
      }else if(key==="under"){
        if(bTrend!=null && bTrend > 0) improvements.push(`IMC: aumento (de ${fmt1(bE)} a ${fmt1(bL)}).`);
        else if(bTrend!=null && bTrend < 0) worsenings.push(`IMC: descenso (de ${fmt1(bE)} a ${fmt1(bL)}).`);
      }else{
        if(bTrend!=null && Math.abs(bTrend) >= 0.6){
          neutrals.push(`IMC: cambio (de ${fmt1(bE)} a ${fmt1(bL)}).`);
        }else{
          neutrals.push("IMC: estable.");
        }
      }
    }else if(wTrend!=null){
      neutrals.push(`Peso: cambio (de ${fmt1(wE)} a ${fmt1(wL)} kg). Para interpretar como mejora/empeoramiento se recomienda indicar altura (IMC) y objetivos.`);
    }

    // SpO2: subir es mejor
    addDelta("SpO₂ (%)", spTrend, "up", 1);
    // Glucose: bajar suele ser mejor si estaba alta; sin contexto, neutral
    if(gE!=null && gL!=null){
      const ctx = latest?.glucoseContext || "unknown";
      if(ctx==="unknown"){
        neutrals.push(`Glucosa: cambio de ${fmt0(gE)} a ${fmt0(gL)} mg/dL (falta contexto ayunas/casual).`);
      }else{
        if(gL < gE) improvements.push(`Glucosa: descenso (de ${fmt0(gE)} a ${fmt0(gL)} mg/dL).`);
        else if(gL > gE) worsenings.push(`Glucosa: aumento (de ${fmt0(gE)} a ${fmt0(gL)} mg/dL).`);
        else neutrals.push("Glucosa: sin cambios.");
      }
    }

    // Consejos y avisos basados SOLO en categorías calculables
    const advice = [];
    const redFlags = [];

    // Red flags BP
    if(sysL!=null && diaL!=null && (sysL >= 180 || diaL >= 120)){
      redFlags.push("PA muy elevada (≥180 sistólica o ≥120 diastólica). Si hay dolor torácico, disnea, cefalea intensa, confusión, debilidad, visión borrosa o síntomas neurológicos: buscar atención urgente.");
    }

    // Red flags SpO2
    if(spL!=null && spL <= 92){
      redFlags.push("SpO₂ baja (≤92%). Recomendable contactar con un profesional sanitario; si es muy baja o hay empeoramiento/síntomas respiratorios, valorar urgencias.");
    }

    // HR
    if(hrL!=null && hrL > 120){
      redFlags.push("Frecuencia cardiaca en reposo muy alta (>120 lpm). Si se acompaña de mareo, dolor torácico, falta de aire o síncope: valoración médica urgente.");
    }

    // Glucose (context-based)
    if(gL!=null){
          }

    // Advice by BP (ESC-based as primary)
    if(bpEsc.key==="unknown"){
      advice.push("Para interpretar la tensión arterial, registra sistólica y diastólica en el último registro (idealmente 2–3 medidas y promediar).");
    }else{
      switch(bpEsc.key){
        case "optimal":
        case "normal":
          advice.push("Mantener hábitos: dieta equilibrada (patrón tipo mediterráneo), limitar sal, actividad física regular, sueño adecuado, evitar tabaco y moderar alcohol.");
          advice.push("Seguir registrando medidas en condiciones comparables (reposo, sentado, tras 5 min de calma).");
          break;
        case "high_normal":
          advice.push("Priorizar cambios de estilo de vida: reducir sal, mejorar la dieta, actividad física aeróbica y fuerza, control de peso si procede.");
          advice.push("Aumentar la frecuencia de medición (p. ej. 2–3 días/semana) y revisar con profesional si persiste.");
          break;
        case "grade1":
          advice.push("Sugerencia: confirmar con mediciones repetidas y revisar factores de riesgo con un profesional sanitario.");
          advice.push("Enfocar en: reducción de sal, pérdida de peso si procede, actividad física, limitar alcohol, gestión de estrés y sueño.");
          break;
        case "grade2":
        case "grade3":
          advice.push("Valores compatibles con hipertensión moderada-severa. Recomendable valoración médica para confirmar y definir plan (incluida posible medicación).");
          advice.push("Mientras tanto: continuar registro y revisar técnica de medición (brazalete adecuado, reposo, brazo a la altura del corazón).");
          break;
      }
    }

    // Advice by HR
    if(hrCat.key==="high"){
      advice.push("Si la frecuencia elevada se repite en reposo: revisar cafeína/estimulantes, hidratación, estrés y sueño; considerar consulta médica si persiste o hay síntomas.");
    }else if(hrCat.key==="low"){
      advice.push("Frecuencia baja puede ser normal en personas entrenadas; si hay mareo, fatiga intensa, síncope o medicación relevante: consultar profesional.");
    }

    // Advice by BMI
    if(bL==null){
      advice.push("Para calcular IMC y afinar recomendaciones de peso, añade la altura del paciente en su ficha.");
    }else{
      if(bmiCatL.key==="over" || bmiCatL.key==="obese"){
        advice.push("Si el objetivo es mejorar el riesgo cardiometabólico, una reducción de peso gradual y sostenible puede ayudar (alimentación, actividad física, sueño).");
      }else if(bmiCatL.key==="under"){
        advice.push("IMC bajo peso: si hay pérdida no intencional, fatiga o síntomas, valorar consulta. Priorizar nutrición adecuada y seguimiento.");
      }else{
        advice.push("IMC en rango habitual: prioriza mantenimiento con hábitos consistentes.");
      }
    }

    // Advice by SpO2
    if(spo2Cat.key==="unknown"){
      advice.push("Si dispones de pulsioxímetro, registrar SpO₂ puede ayudar, especialmente si hay síntomas respiratorios o enfermedad pulmonar.");
    }else if(spo2Cat.key==="borderline"){
      advice.push("SpO₂ algo baja (92–94%): repetir medición en reposo y consultar si se mantiene o hay síntomas.");
    }else if(spo2Cat.key==="low"){
      advice.push("SpO₂ baja: repetir medición, comprobar colocación/artefactos. Si persiste o hay disnea/dolor torácico: consulta médica.");
    }

    // Advice by glucose
    if(gL==null){
      advice.push("Si es relevante (p. ej. diabetes/prediabetes), registra glucosa y especifica si es en ayunas o casual.");
    }else{
      if(latest?.glucoseContext==="unknown"){
        advice.push("Glucosa registrada sin contexto: indica si fue en ayunas (≥8h) o casual para interpretar correctamente.");
      }else{
        const gc = gluCat.key;
        if(gc==="predm"){
          advice.push("Glucosa en rango de prediabetes (según ayunas): recomienda revisión médica y hábitos (peso, actividad, dieta, sueño).");
        }else if(gc==="dm" || gc==="high"){
          advice.push("Glucosa elevada: recomendable valoración médica para confirmar con pruebas estándar (p. ej. HbA1c/ayunas/OGTT) y definir plan.");
        }else if(gc==="low"){
          advice.push("Glucosa baja (<70): si hay síntomas (temblor, sudor, confusión), ingerir carbohidratos de acción rápida y consultar si se repite.");
        }
      }
    }

    // Compose current state text strictly from available values
    const parts = [];
    parts.push(`Último registro: ${latest ? dateLabel(latest.date) : "—"}.`);
    parts.push(`TA: ${sysL!=null && diaL!=null ? (fmt0(sysL)+"/"+fmt0(diaL)+" mmHg") : "—"} (${bpEsc.label}; alternativa ACC/AHA: ${bpAcc.label}).`);
    parts.push(`FC: ${hrL!=null ? (fmt0(hrL)+" lpm") : "—"} (${hrCat.label}).`);
    parts.push(`Peso: ${wL!=null ? (fmt1(wL)+" kg") : "—"}.`);
    parts.push(`Altura: ${patient?.heightCm!=null ? (fmt0(toNum(patient.heightCm))+" cm") : "—"}.`);
    parts.push(`IMC: ${bL!=null ? fmt1(bL) : "—"} (${bmiCatL.label}).`);
    parts.push(`SpO₂: ${spL!=null ? (fmt0(spL)+" %") : "—"} (${spo2Cat.label}).`);
    if(gL!=null){
      const ctx = latest?.glucoseContext==="fasting" ? "Ayunas" : latest?.glucoseContext==="random" ? "Casual" : "Sin contexto";
      parts.push(`Glucosa: ${fmt0(gL)} mg/dL (${ctx}) (${gluCat.label}).`);
    }else{
      parts.push("Glucosa: —.");
    }

    const currentState = parts.join(" ");

    // Ensure we don't claim improvements with insufficient data
    if(recs.length < 2){
      missing.push("Hay menos de 2 registros: no se pueden evaluar tendencias de mejora/empeoramiento con fiabilidad.");
    }

    const summary = {
      missing,
      currentState,
      improvements: improvements.length ? improvements : ["No se pueden afirmar mejoras (o faltan datos/tendencia)."],
      worsenings: worsenings.length ? worsenings : ["No se pueden afirmar empeoramientos (o faltan datos/tendencia)."],
      neutrals: neutrals.length ? neutrals : [],
      advice: advice.length ? advice : ["Registrar más datos para poder ofrecer consejos más específicos."],
      redFlags: redFlags.length ? redFlags : [],
      timeline: buildTimelineSummary(patient),
      stats: {
        last30: {
          count: last30.length,
          avgSys: avgSys30, avgDia: avgDia30, avgHr: avgHr30, avgWeight: avgW30, avgSpo2: avgSp30, avgGlucose: avgG30, avgBmi: avgB30
        },
        latest, earliest
      },
      categories: { bpESC: bpEsc, bpACC: bpAcc, hr: hrCat, spo2: spo2Cat, bmi: bmiCatL, glucose: gluCat }
    };

    return summary;
  }

  global.HealthAnalysis = {
    bpCategoryACC, bpCategoryESC,
    hrCategory, spo2Category,
    glucoseCategory,
    bmi, bmiCategory,
    lastRecord,
    sortRecordsDesc,
    buildMedicalReport,
    buildTimelineSummary,
    fmt0, fmt1, dateLabel
  };
})(window);
