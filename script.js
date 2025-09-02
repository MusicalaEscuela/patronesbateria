// ======================================
// Config
// ======================================
const TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX4ca9XnbT8xNTvV0B2cES5YVVMTot8ms5IztDAriYnjMycEUsdeJFvQSMz9ZvKGH-9Hc47QUQs9pW/pub?gid=0&single=true&output=tsv";

// ======================================
/* Estado Global de Reproducción (motor único) */
// ======================================
let tempo = 120; // BPM
let isPlaying = false;
let playTimer = null;
let currentSeq = [];         // array de golpes ["B","R",...]
let currentIndex = 0;        // índice del golpe actual
let currentTableRef = null;  // {type:'generados'|'avanzados'|'custom', rowIndex: number|null}
let currentInterval = (60 / tempo) * 1000;

const sonidos = {
  B: new Audio("bombo.wav"),
  R: new Audio("redoblante.wav"),
  P: new Audio("platillo.wav")
};

// ======================================
// Datos (separados)
// ======================================
const generados = [];              // [{nombre, secuencia, categoria, longitud}]
const avanzados = [];              // (desde hoja externa)
let patronPersonalizado = [];      // para el creador

// Deduplicación POR LISTA (no mezclamos)
const secuenciasGenerados = new Set();
const secuenciasAvanzados = new Set();

// Filtros actuales
let filtroCatGenerados = "todos";  // 'todos' | 'Simples' | 'Combinados' | 'Complejos'
let filtroLenGenerados = null;     // 2 | 3 | 4 | null
let filtroLenAvanzados = null;     // 2 | 3 | 4 | null

// ======================================
// Utilidades
// ======================================
function clasificarPatron(arr) {
  const u = new Set(arr);
  if (u.size === 1) return "Simples";
  if (u.size === 2) return "Combinados";
  return "Complejos";
}

function normalizarSecuencia(seq) {
  return String(seq).toUpperCase().trim().split(/\s+/).join(" ");
}

function agregarGenerado({ nombre, secuencia }) {
  const clave = normalizarSecuencia(secuencia);
  if (secuenciasGenerados.has(clave)) return;
  secuenciasGenerados.add(clave);
  const golpes = clave.split(" ");
  generados.push({
    nombre,
    secuencia: clave,
    categoria: clasificarPatron(golpes),
    longitud: golpes.length
  });
}

function agregarAvanzado({ compas, secuencia }) {
  const clave = normalizarSecuencia(secuencia);
  if (secuenciasAvanzados.has(clave)) return;
  secuenciasAvanzados.add(clave);
  const golpes = clave.split(" ");
  avanzados.push({
    nombre: compas,
    secuencia: clave,
    categoria: "Avanzados", // marcado explícito
    longitud: golpes.length
  });
}

// ======================================
// Generación automática (2,3,4 golpes)
// ======================================
function generarCombinaciones(el, len) {
  if (len === 1) return el.map(e => [e]);
  const comb = [];
  generarCombinaciones(el, len - 1).forEach(prev => {
    el.forEach(x => comb.push([...prev, x]));
  });
  return comb;
}

function generarPatronesBasicos() {
  [2, 3, 4].forEach(len => {
    const arrs = generarCombinaciones(["B", "R", "P"], len);
    arrs.forEach(p => {
      agregarGenerado({
        nombre: `Patrón (${len} golpes)`,
        secuencia: p.join(" ")
      });
    });
  });
}

// ======================================
// Carga TSV (Avanzados)
// ======================================
async function cargarAvanzadosDesdeTSV() {
  const tabla = document.getElementById("pattern-table-avanzados");
  if (tabla) tabla.innerHTML = `<tr><td colspan="3">Cargando patrones avanzados…</td></tr>`;

  try {
    const resp = await fetch(TSV_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();

    const lineas = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim().length > 0);
    if (lineas.length <= 1) {
      renderAvanzados();
      return;
    }

    const headers = lineas[0].split("\t").map(h => h.trim().toLowerCase());
    const idxCompas = headers.indexOf("compás") !== -1 ? headers.indexOf("compás") : headers.indexOf("compas");
    const idxSec = headers.indexOf("secuencia");

    for (let i = 1; i < lineas.length; i++) {
      const cols = lineas[i].split("\t").map(c => c.trim());
      if (cols.length <= Math.max(idxCompas, idxSec)) continue;

      const compas = cols[idxCompas] || `Compás ${i}`;
      const secuencia = cols[idxSec] || "";
      if (!secuencia) continue;

      // Validar tokens (solo B R P)
      const tokens = normalizarSecuencia(secuencia).split(" ");
      const valid = tokens.every(t => ["B", "R", "P"].includes(t));
      if (!valid) continue;

      agregarAvanzado({ compas, secuencia });
    }

    renderAvanzados();
  } catch (e) {
    console.error("Error cargando TSV:", e);
    if (tabla) tabla.innerHTML = `<tr><td colspan="3">No se pudo cargar la hoja externa.</td></tr>`;
  }
}

// ======================================
// Render de Tablas
// ======================================
function renderGenerados() {
  const tbody = document.getElementById("pattern-table-generados");
  tbody.innerHTML = "";

  const lista = generados.filter(p => {
    const catOK = (filtroCatGenerados === "todos") || (p.categoria === filtroCatGenerados);
    const lenOK = (filtroLenGenerados === null) || (p.longitud === filtroLenGenerados);
    return catOK && lenOK;
  });

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="3">No hay patrones con ese filtro.</td></tr>`;
    return;
  }

  lista.forEach((p, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.rowType = "generados";
    tr.dataset.rowIndex = String(idx);

    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.secuencia}</td>
      <td>
        <button onclick="reproducirDeGenerados(${idx})">Reproducir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAvanzados() {
  const tbody = document.getElementById("pattern-table-avanzados");
  tbody.innerHTML = "";

  const lista = avanzados.filter(p => {
    const lenOK = (filtroLenAvanzados === null) || (p.longitud === filtroLenAvanzados);
    return lenOK;
  });

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="3">No hay patrones avanzados (o el filtro no coincide).</td></tr>`;
    return;
  }

  lista.forEach((p, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.rowType = "avanzados";
    tr.dataset.rowIndex = String(idx);

    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.secuencia}</td>
      <td>
        <button onclick="reproducirDeAvanzados(${idx})">Reproducir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================
// Filtros (Generados)
// ======================================
function filtrarPatronesGenerados(cat) {
  filtroCatGenerados = cat;
  renderGenerados();
}
function filtrarLongitudGenerados(len) {
  filtroLenGenerados = len;
  renderGenerados();
}

// ======================================
// Filtros (Avanzados)
// ======================================
function filtrarPatronesAvanzados(_todos) {
  filtroLenAvanzados = null; // reset longitud, mostrar todo
  renderAvanzados();
}
function filtrarLongitudAvanzados(len) {
  filtroLenAvanzados = len;
  renderAvanzados();
}

// ======================================
// Motor de reproducción (loop infinito)
// ======================================
function scheduleNextTick() {
  if (!isPlaying || currentSeq.length === 0) return;

  // Reproducir golpe actual
  const g = currentSeq[currentIndex];
  const audio = sonidos[g];
  if (audio) {
    try {
      audio.currentTime = 0;
      audio.play();
    } catch (e) {
      // Por si autoplay bloquea, ignoramos
    }
  }

  // Animar batería
  const el = document.getElementById(g === "B" ? "bombo" : g === "R" ? "redoblante" : "platillo");
  if (el) {
    el.classList.add("active");
    setTimeout(() => el.classList.remove("active"), currentInterval / 2);
  }

  // Avanzar índice (loop)
  currentIndex = (currentIndex + 1) % currentSeq.length;

  // Programar siguiente tick con el intervalo actual
  playTimer = setTimeout(scheduleNextTick, currentInterval);
}

function reproducirSecuencia(seqArray, tableRef = { type: null, rowIndex: null }) {
  // Si ya está sonando algo, paro antes de iniciar
  if (isPlaying) pararReproduccion(false);

  currentSeq = seqArray.slice();
  currentIndex = 0;
  currentTableRef = tableRef;
  isPlaying = true;
  currentInterval = (60 / tempo) * 1000;

  // Resaltar fila activa en la tabla (si aplica)
  marcarFilaActiva();

  scheduleNextTick();
}

function pararReproduccion(resetHighlight = true) {
  isPlaying = false;
  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }
  // Quitar animación de batería por si quedó encendida
  ["bombo", "redoblante", "platillo"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });

  if (resetHighlight) desmarcarFilasActivas();

  currentSeq = [];
  currentIndex = 0;
  currentTableRef = null;
}

function marcarFilaActiva() {
  desmarcarFilasActivas();
  if (!currentTableRef || currentTableRef.rowIndex == null) return;

  const tbodyId = currentTableRef.type === "generados" ? "pattern-table-generados" :
                  currentTableRef.type === "avanzados" ? "pattern-table-avanzados" : null;
  if (!tbodyId) return;

  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = tbody.querySelectorAll("tr");
  const row = rows[currentTableRef.rowIndex];
  if (row) row.style.background = "#fff7e6"; // leve highlight
}

function desmarcarFilasActivas() {
  ["pattern-table-generados", "pattern-table-avanzados"].forEach(id => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    tbody.querySelectorAll("tr").forEach(tr => {
      tr.style.background = "";
    });
  });
}

// ======================================
// Acciones de tablas (onclick)
// ======================================
function reproducirDeGenerados(idx) {
  const lista = generados.filter(p => {
    const c = (filtroCatGenerados === "todos") || (p.categoria === filtroCatGenerados);
    const l = (filtroLenGenerados === null) || (p.longitud === filtroLenGenerados);
    return c && l;
  });
  const item = lista[idx];
  if (!item) return;

  const seq = item.secuencia.split(" ");
  reproducirSecuencia(seq, { type: "generados", rowIndex: idx });
}

function reproducirDeAvanzados(idx) {
  const lista = avanzados.filter(p => {
    const l = (filtroLenAvanzados === null) || (p.longitud === filtroLenAvanzados);
    return l;
  });
  const item = lista[idx];
  if (!item) return;

  const seq = item.secuencia.split(" ");
  reproducirSecuencia(seq, { type: "avanzados", rowIndex: idx });
}

// ======================================
// Creador personalizado
// ======================================
function agregarAlPatron(g) {
  patronPersonalizado.push(g);
  actualizarVistaPatron();
}
function limpiarPatron() {
  patronPersonalizado = [];
  actualizarVistaPatron();
}
function actualizarVistaPatron() {
  document.getElementById("current-pattern").textContent =
    patronPersonalizado.join(" - ") || "Ningún golpe seleccionado";
}
function reproducirPatronPersonalizado() {
  if (!patronPersonalizado.length) {
    alert("Agrega algunos golpes primero");
    return;
  }
  const seq = patronPersonalizado.slice(); // e.g., ["B","R","P"]
  reproducirSecuencia(seq, { type: "custom", rowIndex: null });
}

// ======================================
// Control de tempo
// ======================================
const tempoSlider = document.getElementById("tempo-slider");
const tempoDisplay = document.getElementById("tempo-display");
tempoSlider.addEventListener("input", () => {
  tempo = Number(tempoSlider.value);
  tempoDisplay.textContent = tempo;

  // actualizar intervalo y reprogramar próximo tick si está sonando
  currentInterval = (60 / tempo) * 1000;
  if (isPlaying) {
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
    // reprogramar el siguiente golpe con el nuevo intervalo (mantiene el índice actual)
    playTimer = setTimeout(scheduleNextTick, currentInterval);
  }
});

// ======================================
// Render inicial y carga de datos
// ======================================
function init() {
  // Generar básicos
  generarPatronesBasicos();
  renderGenerados();

  // Cargar avanzados desde la hoja externa (sección separada)
  cargarAvanzadosDesdeTSV();
}

window.onload = init;

// Exponer pararReproduccion para botones del HTML
window.pararReproduccion = pararReproduccion;
// Exponer filtros/acciones usados en HTML
window.filtrarPatronesGenerados = filtrarPatronesGenerados;
window.filtrarLongitudGenerados = filtrarLongitudGenerados;
window.filtrarPatronesAvanzados = filtrarPatronesAvanzados;
window.filtrarLongitudAvanzados = filtrarLongitudAvanzados;
window.reproducirDeGenerados = reproducirDeGenerados;
window.reproducirDeAvanzados = reproducirDeAvanzados;
window.agregarAlPatron = agregarAlPatron;
window.limpiarPatron = limpiarPatron;
window.reproducirPatronPersonalizado = reproducirPatronPersonalizado;
