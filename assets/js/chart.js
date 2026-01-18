/* assets/js/chart.js
   Render simple charts (sin dependencias externas).
   - Dibuja una serie (o dos, en TA Sistólica/Diastólica) sobre un canvas.
   - Si un dato está ausente (null/undefined), se omite del trazado (no se asume 0).
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

  function drawAxes(ctx, w, h, pad, yTicks, xLabels){
    // background grid
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";

    // Y grid + labels
    const {min, max, step} = yTicks;
    const plotH = h - pad.t - pad.b;
    const plotW = w - pad.l - pad.r;

    const yToPix = (y)=> pad.t + (max - y) * (plotH / (max - min));

    for(let y=min; y<=max+1e-9; y+=step){
      const yy = yToPix(y);
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(pad.l + plotW, yy);
      ctx.stroke();
      ctx.fillText(String(Math.round(y*10)/10).replace(".",","), 8, yy+4);
    }

    // X labels (sparse)
    const n = xLabels.length;
    if(n>1){
      const every = Math.ceil(n/6);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      for(let i=0;i<n;i+=every){
        const x = pad.l + (i*(plotW/(n-1)));
        ctx.fillText(xLabels[i], x-18, h-8);
      }
    }

    ctx.restore();
  }

  function drawLine(ctx, w, h, pad, yTicks, series, strokeStyle){
    const {min, max} = yTicks;
    const plotH = h - pad.t - pad.b;
    const plotW = w - pad.l - pad.r;

    const yToPix = (y)=> pad.t + (max - y) * (plotH / (max - min));
    const xToPix = (i,n)=> pad.l + (i*(plotW/Math.max(1,(n-1))));

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
    const pad = {l:58, r:18, t:18, b:28};

    clear(ctx,w,h);

    // bg
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
    drawAxes(ctx,w,h,pad,ticks,data.labels);

    // Legend + lines
    const strokes = ["rgba(47,107,255,1)","rgba(245,158,11,1)"]; // azul / ámbar
    data.series.forEach((s, idx)=>{
      drawLine(ctx,w,h,pad,ticks,s.data,strokes[idx % strokes.length]);
    });

    // Title
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(metricTitle(metric) + (data.unit ? ` (${data.unit})` : ""), pad.l, 14);
    ctx.restore();

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
