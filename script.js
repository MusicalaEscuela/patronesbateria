// script.js

let tempo = 120; // BPM por defecto
let patronPersonalizado = [];

// Lista completa de patrones
const elementos = ['B', 'R', 'P'];
const patrones = [];

// Generar todas las combinaciones posibles (2, 3 y 4 golpes)
function generarPatrones() {
    [2, 3, 4].forEach(longitud => {
        generarCombinaciones(elementos, longitud).forEach(patron => {
            const secuencia = patron.join(' ');
            const categoria = clasificarPatron(patron);
            patrones.push({
                nombre: `Patrón ${categoria} (${longitud} golpes)`,
                secuencia: secuencia,
                categoria: categoria,
                longitud: longitud
            });
        });
    });
}

// Generar combinaciones con repetición
function generarCombinaciones(elementos, longitud) {
    if (longitud === 1) return elementos.map(e => [e]);

    const combinaciones = [];
    generarCombinaciones(elementos, longitud - 1).forEach(prev => {
        elementos.forEach(el => {
            combinaciones.push([...prev, el]);
        });
    });

    return combinaciones;
}

// Clasificar patrones
function clasificarPatron(patron) {
    const unicos = new Set(patron);
    if (unicos.size === 1) return 'Simples';
    if (unicos.size === 2) return 'Combinados';
    return 'Complejos';
}

// Cargar sonidos
const sonidos = {
    B: new Audio('bombo.mp3'),
    R: new Audio('redoblante.mp3'),
    P: new Audio('platillo.mp3')
};

// Cargar tabla de patrones
function cargarTabla(filtroCategoria = 'todos', filtroLongitud = null) {
    const tabla = document.getElementById('pattern-table');
    tabla.innerHTML = '';

    const patronesFiltrados = patrones.filter(patron => {
        const categoriaMatch = filtroCategoria === 'todos' || patron.categoria === filtroCategoria;
        const longitudMatch = filtroLongitud === null || patron.longitud === filtroLongitud;
        return categoriaMatch && longitudMatch;
    });

    if (patronesFiltrados.length === 0) {
        tabla.innerHTML = `<tr><td colspan="3">No se encontraron patrones para el filtro seleccionado.</td></tr>`;
        return;
    }

    patronesFiltrados.forEach(patron => {
        const fila = document.createElement('tr');

        const nombreCelda = document.createElement('td');
        nombreCelda.textContent = patron.nombre;

        const secuenciaCelda = document.createElement('td');
        secuenciaCelda.textContent = patron.secuencia;

        const botonCelda = document.createElement('td');
        const boton = document.createElement('button');
        boton.textContent = 'Reproducir';
        boton.addEventListener('click', () => reproducirPatron(patron.secuencia));
        botonCelda.appendChild(boton);

        fila.appendChild(nombreCelda);
        fila.appendChild(secuenciaCelda);
        fila.appendChild(botonCelda);

        tabla.appendChild(fila);
    });
}

// Reproducir patrón
function reproducirPatron(secuencia) {
    const golpes = secuencia.split(' ');
    let indice = 0;
    const intervalo = (60 / tempo) * 1000;

    function siguienteGolpe() {
        if (indice < golpes.length) {
            const golpe = golpes[indice];
            sonidos[golpe].currentTime = 0;
            sonidos[golpe].play();

            const elemento = document.getElementById(nombreElemento(golpe));
            elemento.classList.add('active');
            setTimeout(() => {
                elemento.classList.remove('active');
            }, intervalo / 2);

            indice++;
            setTimeout(siguienteGolpe, intervalo);
        }
    }
    siguienteGolpe();
}

// Mapeo de letras a IDs
function nombreElemento(letra) {
    return letra === 'B' ? 'bombo' : letra === 'R' ? 'redoblante' : 'platillo';
}

// Filtro por categoría
function filtrarPatrones(categoria) {
    cargarTabla(categoria, null);
}

// Filtro por longitud
function filtrarPorLongitud(longitud) {
    cargarTabla('todos', longitud);
}

// Control de Velocidad
const tempoSlider = document.getElementById('tempo-slider');
const tempoDisplay = document.getElementById('tempo-display');
tempoSlider.addEventListener('input', () => {
    tempo = tempoSlider.value;
    tempoDisplay.textContent = tempo;
});

// ✅ Creador de patrones personalizados (con visualización actualizada)
function agregarAlPatron(golpe) {
    patronPersonalizado.push(golpe); // Agrega el golpe seleccionado al patrón
    actualizarVistaPatron(); // Actualiza la vista del patrón
}

function limpiarPatron() {
    patronPersonalizado = [];
    actualizarVistaPatron();
}

function actualizarVistaPatron() {
    const patronActual = patronPersonalizado.join(' - '); // Separa los golpes con guiones
    const vistaPatron = document.getElementById('current-pattern');

    console.log("Patrón actual:", patronActual); // Depuración

    if (vistaPatron) {
        vistaPatron.textContent = patronActual || 'Ningún golpe seleccionado';
    } else {
        console.error("No se encontró el elemento con id 'current-pattern'");
    }
}

function reproducirPatronPersonalizado() {
    if (patronPersonalizado.length > 0) {
        reproducirPatron(patronPersonalizado.join(' '));
    } else {
        alert('Agrega algunos golpes al patrón antes de reproducir.');
    }
}

// Inicialización
window.onload = () => {
    generarPatrones();
    mostrarMensajeInicio();
    tempoDisplay.textContent = tempo;
    actualizarVistaPatron(); // Mostrar mensaje inicial en el creador de patrones
};

// Mostrar mensaje cuando no hay patrones cargados
function mostrarMensajeInicio() {
    const tabla = document.getElementById('pattern-table');
    tabla.innerHTML = `<tr><td colspan="3">Selecciona una categoría o longitud para ver los patrones.</td></tr>`;
}

