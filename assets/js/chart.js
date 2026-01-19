/* assets/js/chart.js
   Render simple charts (sin dependencias externas).
   - Dibuja una serie (o dos, en TA Sistólica/Diastólica) sobre un canvas.
   - Si un dato está ausente (null/undefined), se omite del trazado (no se asume 0).
   - Incluye franjas de fondo (verde/naranja/rojo) para rangos orientativos:
     verde = óptimo, naranja = normal/aceptable, rojo = fuera de rango.
     Nota: son rangos orientativos para visualización, no sustituyen una valoración clínica.
*/
(function(global){
  function toNum(x){
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function sortAsc(records){
    return (records||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  }

  function niceTicks(minV, maxV, tickCount=5){
    if(minV==null || maxV==null) return {min:0, max:1, step:1};
    if(minV===maxV){
      const pad = (Math.abs(minV) || 1) * 0.1;
      minV -= pad; maxV += pad;
    }
    const span = maxV - minV;
    const rawStep = span / Math.max(1,(tickCount-1));
    const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const frac = rawStep / pow10;
    let niceFrac = 1;
    if(frac <= 1) niceFrac = 1;
    else if(frac <= 2) niceFrac = 2;
    else if(frac <= 5) niceFrac = 5;
    else niceFrac = 10;
    const step = niceFrac * pow10;
    const min = Math.floor(minV/step)*step;
    const max = Math.ceil(maxV/step)*step;
    return {min, max, step};
  }

  function clear(ctx, w, h){
    ctx.clearRect(0,0,w,h);
  }

  function plotGeom(w,h,pad){
    return {
      plotH: h - pad.t - pad.b,
      plotW: w - pad.l - pad.r,
      x0: pad.l,
      y0: pad.t
    };
  }

  function yToPixFactory(pad, yTicks, plotH){
    const {min, max} = yTicks;
    const denom = (max - min) || 1;
    return (y)=> pad.t + (max - y) * (plotH / denom);
  }

  function clamp(n,a,b){
    return Math.max(a, Math.min(b, n));
  }

  // Franjas de fondo: rojo (base) + naranja (rango normal) + verde (rango óptimo)
  function drawBands(ctx, w, h, pad, yTicks, metric, patient){
    const {plotH, plotW, x0, y0} = plotGeom(w,h,pad);
    const yToPix = yToPixFactory(pad, yTicks, plotH);

    const ranges = bandRanges(metric, patient);
    if(!ranges) return {hasBands:false};

    const colors = {
      red:   "rgba(239,68,68,0.18)",
      orange:"rgba(245,158,11,0.18)",
      green: "rgba(34,197,94,0.20)"
    };

    ctx.save();
    // Base roja en toda el área de trazado
    ctx.fillStyle = colors.red;
    ctx.fillRect(x0, y0, plotW, plotH);

    // Naranja (normal) — se superpone
    if(ranges.normal){
      const a = clamp(ranges.normal.from, yTicks.min, yTicks.max);
      const b = clamp(ranges.normal.to,   yTicks.min, yTicks.max);
      const yA = yToPix(a);
      const yB = yToPix(b);
      const top = Math.min(yA,yB);
      const hh  = Math.abs(yB-yA);
      if(hh > 1){
        ctx.fillStyle = colors.orange;
        ctx.fillRect(x0, top, plotW, hh);
      }
    }

    // Verde (óptimo) — se superpone
    if(ranges.optimal){
      const a = clamp(ranges.optimal.from, yTicks.min, yTicks.max);
      const b = clamp(ranges.optimal.to,   yTicks.min, yTicks.max);
      const yA = yToPix(a);
      const yB = yToPix(b);
      const top = Math.min(yA,yB);
      const hh  = Math.abs(yB-yA);
      if(hh > 1){
        ctx.fillStyle = colors.green;
        ctx.fillRect(x0, top, plotW, hh);
      }
    }

    ctx.restore();
    return {hasBands:true, note:ranges.note||""};
  }

  function bandRanges(metric, patient){
    // Devuelve rangos {optimal:{from,to}, normal:{from,to}, note?}
    // Nota: los rangos son orientativos y se usan solo para franjas.
    //
    // En "weight", si hay altura, se convierte a rangos equivalentes de IMC.
    const h = toNum(patient?.heightCm);
    const m = (h!=null && h>0) ? (h/100) : null;

    if(metric === "bp"){
      // Aproximación por sistólica (mmHg)
      return {
        optimal: {from: 90, to: 119},
        normal:  {from: 90, to: 139},
        note: "Franjas orientativas para TA (aprox. por sistólica)."
      };
    }

    if(metric === "hr"){
      return {
        optimal: {from: 60, to: 80},
        normal:  {from: 50, to: 100},
        note: "Franjas orientativas para FC en reposo."
      };
    }

    if(metric === "spo2"){
      return {
        optimal: {from: 95, to: 100},
        normal:  {from: 92, to: 100},
        note: "Franjas orientativas para SpO₂ (en reposo)."
      };
    }

    if(metric === "glucose"){
      return {
        optimal: {from: 70, to: 99},
        normal:  {from: 70, to: 140},
        note: "Franjas orientativas; la glucosa depende de ayunas/casual."
      };
    }

    if(metric === "bmi"){
      return {
        optimal: {from: 18.5, to: 24.9},
        normal:  {from: 18.5, to: 29.9},
        note: "Franjas orientativas por categorías de IMC."
      };
    }

    if(metric === "weight"){
      if(!m){
        return { note: "Sin franjas: falta altura para convertir peso a rangos de IMC." };
      }
      const w18 = 18.5 * (m*m);
      const w25 = 24.9 * (m*m);
      const w30 = 29.9 * (m*m);
      return {
        optimal: {from: w18, to: w25},
        normal:  {from: w18, to: w30},
        note: "Franjas del peso calculadas a partir de rangos de IMC (requiere altura)."
      };
    }

    return null;
  }

  function drawAxes(ctx, w, h, pad, yTicks, xLabels){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";

    const {min, max, step} = yTicks;
    const {plotH, plotW, x0} = plotGeom(w,h,pad);
    const yToPix = yToPixFactory(pad, yTicks, plotH);

    // Labels eje Y (alineados a la derecha dentro del padding)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for(let y=min; y<=max+1e-9; y+=step){
      const yy = yToPix(y);
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + plotW, yy);
      ctx.stroke();
      const txt = String(Math.round(y*10)/10).replace(".",",");
      ctx.fillText(txt, x0 - 8, yy);
    }

    // X labels (sparse)
    const n = xLabels.length;
    if(n>1){
      const every = Math.ceil(n/6);
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      for(let i=0;i<n;i+=every){
        const x = x0 + (i*(plotW/(n-1)));
        ctx.fillText(xLabels[i], x, h-8);
      }
    }

    ctx.restore();
  }

  function drawLine(ctx, w, h, pad, yTicks, series, strokeStyle){
    const {min, max} = yTicks;
    const {plotH, plotW, x0} = plotGeom(w,h,pad);

    const denom = (max - min) || 1;
    const yToPix = (y)=> pad.t + (max - y) * (plotH / denom);
    const xToPix = (i,n)=> x0 + (i*(plotW/Math.max(1,(n-1))));

    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    const n = series.length;
    for(let i=0;i<n;i++){
      const y = series[i];
      if(y==null){
        started = false;
        continue;
      }
      const x = xToPix(i,n);
      const yy = yToPix(y);
      if(!started){
        ctx.moveTo(x, yy);
        started = true;
      }else{
        ctx.lineTo(x, yy);
      }
    }
    ctx.stroke();

    // points
    ctx.fillStyle = strokeStyle;
    for(let i=0;i<n;i++){
      const y = series[i];
      if(y==null) continue;
      const x = xToPix(i,n);
      const yy = yToPix(y);
      ctx.beginPath();
      ctx.arc(x, yy, 3, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function computeDomain(seriesArr){
    let minV=null, maxV=null;
    for(const s of seriesArr){
      for(const v of s){
        if(v==null) continue;
        if(minV==null || v<minV) minV=v;
        if(maxV==null || v>maxV) maxV=v;
      }
    }
    return {minV, maxV};
  }

  function formatDateShort(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"});
    }catch(_){ return ""; }
  }

  function buildSeries(patient, metric){
    const recs = sortAsc(patient?.records||[]);
    const labels = recs.map(r=>formatDateShort(r.date));
    if(metric==="bp"){
      const sys = recs.map(r=>toNum(r.bpSys));
      const dia = recs.map(r=>toNum(r.bpDia));
      return {labels, series:[{name:"Sistólica", data:sys},{name:"Diastólica", data:dia}], unit:"mmHg"};
    }
    if(metric==="weight"){
      return {labels, series:[{name:"Peso", data:recs.map(r=>toNum(r.weight))}], unit:"kg"};
    }
    if(metric==="bmi"){
      const h = patient?.heightCm;
      const bmi = recs.map(r=>{
        const w = toNum(r.weight);
        const hc = toNum(h);
        if(w==null || hc==null || hc<=0) return null;
        const m = hc/100;
        return w/(m*m);
      });
      return {labels, series:[{name:"IMC", data:bmi}], unit:"kg/m²"};
    }
    if(metric==="hr"){
      return {labels, series:[{name:"Frecuencia", data:recs.map(r=>toNum(r.hr))}], unit:"lpm"};
    }
    if(metric==="spo2"){
      return {labels, series:[{name:"SpO₂", data:recs.map(r=>toNum(r.spo2))}], unit:"%"};
    }
    if(metric==="glucose"){
      return {labels, series:[{name:"Glucosa", data:recs.map(r=>toNum(r.glucose))}], unit:"mg/dL"};
    }
    return {labels, series:[], unit:""};
  }

  function render(canvas, patient, metric, theme){
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const pad = {l:62, r:18, t:22, b:28};

    clear(ctx,w,h);

    // canvas background
    ctx.save();
    ctx.fillStyle = theme?.panel || "#111a2e";
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    const data = buildSeries(patient, metric);
    const allSeries = data.series.map(s=>s.data);
    const {minV, maxV} = computeDomain(allSeries);

    // If no data, show message
    const hasAny = allSeries.some(s=>s.some(v=>v!=null));
    if(!hasAny){
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("No hay datos suficientes para este gráfico.", 18, 38);
      ctx.restore();
      return {unit:data.unit, series:data.series};
    }

    const ticks = niceTicks(minV, maxV, 6);

    // Franjas de fondo (si hay rangos definidos)
    const bandInfo = drawBands(ctx,w,h,pad,ticks,metric,patient);

    // Ejes y rejilla (encima de las franjas)
    drawAxes(ctx,w,h,pad,ticks,data.labels);

    // Líneas
    const strokes = ["rgba(47,107,255,1)","rgba(245,158,11,1)"]; // azul / ámbar
    data.series.forEach((s, idx)=>{
      drawLine(ctx,w,h,pad,ticks,s.data,strokes[idx % strokes.length]);
    });

    // Title
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(metricTitle(metric) + (data.unit ? ` (${data.unit})` : ""), pad.l, 16);
    ctx.restore();

    // Nota de franjas (si aplica)
    if(bandInfo?.note){
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText(bandInfo.note, pad.l, h-12);
      ctx.restore();
    }

    return {unit:data.unit, series:data.series};
  }

  function metricTitle(metric){
    switch(metric){
      case "bp": return "Tensión arterial (Sistólica / Diastólica)";
      case "weight": return "Peso";
      case "bmi": return "IMC";
      case "hr": return "Frecuencia cardiaca";
      case "spo2": return "SpO₂";
      case "glucose": return "Glucosa";
      default: return "Gráfico";
    }
  }

  global.ChartHub = { render, metricTitle };
})(window);
