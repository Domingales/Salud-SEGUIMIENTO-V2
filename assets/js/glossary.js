/* assets/js/glossary.js
   Glosario de términos usados por la app (lenguaje claro).
*/
(function(global){
  const TERMS = {
    "HTA grado 1": {
      title: "HTA grado 1 (Hipertensión arterial, grado 1)",
      desc: "Clasificación europea (ESC/ESH) para tensión arterial elevada de forma persistente. Suele corresponder a valores aproximados de sistólica 140–159 y/o diastólica 90–99 mmHg en consulta.",
      why: "Una tensión elevada mantenida aumenta el riesgo cardiovascular a medio/largo plazo.",
      what: "Confirmar con varias mediciones en días distintos y comentar los resultados con un profesional. Mejorar hábitos (sal, peso, ejercicio, alcohol, sueño) según proceda."
    },
    "HTA grado 2": {
      title: "HTA grado 2 (Hipertensión arterial, grado 2)",
      desc: "Clasificación europea para valores más altos: sistólica 160–179 y/o diastólica 100–109 mmHg.",
      why: "Riesgo cardiovascular mayor que en grado 1 si se mantiene en el tiempo.",
      what: "Recomendable valoración médica para confirmar, descartar causas y definir plan."
    },
    "HTA grado 3": {
      title: "HTA grado 3 (Hipertensión arterial, grado 3)",
      desc: "Clasificación europea para valores muy altos: sistólica ≥180 y/o diastólica ≥110 mmHg.",
      why: "Riesgo elevado. Puede requerir evaluación médica prioritaria.",
      what: "Repetir medición correctamente. Si se mantiene o hay síntomas, buscar atención médica."
    },
    "Normal-alta": {
      title: "Tensión normal-alta",
      desc: "Valores por encima de lo ideal pero sin llegar a hipertensión (según la clasificación europea).",
      why: "Puede ser una señal temprana: conviene vigilar y optimizar hábitos.",
      what: "Registrar con regularidad y priorizar estilo de vida saludable."
    },
    "PA elevada": {
      title: "PA elevada (Presión arterial elevada)",
      desc: "Clasificación ACC/AHA: sistólica 120–129 y diastólica <80.",
      why: "Puede progresar a hipertensión si no se controla.",
      what: "Hábitos (sal, peso, actividad, alcohol, sueño) y seguimiento."
    },
    "Crisis hipertensiva": {
      title: "Crisis hipertensiva",
      desc: "Tensión muy alta (por ejemplo, sistólica ≥180 o diastólica ≥120).",
      why: "Si se acompaña de síntomas (dolor torácico, falta de aire, debilidad, confusión, etc.) puede ser una urgencia.",
      what: "Repetir medición y, si hay síntomas o valores persisten, buscar atención médica urgente."
    },
    "IMC": {
      title: "IMC (Índice de Masa Corporal)",
      desc: "Número que relaciona peso y altura (kg/m²). Se usa como orientación para clasificar bajo peso, normopeso, sobrepeso u obesidad.",
      why: "Se asocia con riesgo cardiometabólico, pero no distingue masa muscular vs grasa.",
      what: "Interpretar con contexto (composición corporal, perímetro abdominal, hábitos, objetivos)."
    },
    "SpO₂": {
      title: "SpO₂ (Saturación de oxígeno)",
      desc: "Porcentaje estimado de oxígeno en sangre medido con pulsioxímetro (dedo).",
      why: "Ayuda a detectar problemas respiratorios o empeoramiento en ciertas enfermedades.",
      what: "Medir en reposo, con manos calientes. Si es baja y se repite, consultar."
    },
    "Bradicardia": {
      title: "Bradicardia",
      desc: "Frecuencia cardiaca baja (a menudo <60 lpm). En personas entrenadas puede ser normal.",
      why: "Si se acompaña de mareo, desmayo o fatiga, puede requerir evaluación.",
      what: "Valorar contexto, medicación y síntomas; consultar si hay malestar."
    },
    "Taquicardia": {
      title: "Taquicardia",
      desc: "Frecuencia cardiaca alta (a menudo >100 lpm en reposo).",
      why: "Puede deberse a estrés, fiebre, deshidratación, cafeína, dolor o arritmias.",
      what: "Repetir medición en reposo, revisar desencadenantes y consultar si persiste o hay síntomas."
    },
    "Prediabetes": {
      title: "Prediabetes",
      desc: "Rango de glucosa o HbA1c por encima de lo normal pero por debajo de diabetes.",
      why: "Riesgo aumentado de diabetes y enfermedad cardiovascular.",
      what: "Hábitos (peso, ejercicio, dieta, sueño) y seguimiento con profesional."
    },
    "Ayunas": {
      title: "Glucosa en ayunas",
      desc: "Glucosa medida tras al menos 8 horas sin ingerir calorías.",
      why: "Su interpretación difiere de la glucosa casual.",
      what: "Indicar siempre el contexto para interpretar correctamente."
    },
    "Casual": {
      title: "Glucosa casual (no ayunas)",
      desc: "Glucosa medida en cualquier momento del día, sin ayuno.",
      why: "Se interpreta de forma distinta a la glucosa en ayunas.",
      what: "Registrar si fue casual y, si es necesario, repetir en ayunas o con pruebas indicadas por el médico."
    }
  };

  function keys(){
    return Object.keys(TERMS).sort((a,b)=>a.localeCompare(b,"es"));
  }

  function get(term){
    return TERMS[term] || null;
  }

  global.Glossary = { keys, get };
})(window);
