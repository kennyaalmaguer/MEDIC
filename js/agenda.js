// agenda.js
let currentDate = new Date();
let selectedDoctorId = null;
let selectedDoctorName = null;
let selectedTime = null;
let selectedDateValue = null;
let guardandoCita = false;

let medicosBD = [];
let citasBD = [];
let espSel = '';      
let medSel = '';      
let errorCarga = false;

const horasAgenda = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '04:00 PM', '05:30 PM'];

// Sistema de Alertas Estilizadas usando css/alertas.css
function mostrarAlerta(texto, tipo = 'success') {
  let container = document.getElementById('customAlertContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'customAlertContainer';
    container.className = 'custom-alert-container';
    document.body.appendChild(container);
  }

  const alertBox = document.createElement('div');
  alertBox.className = `custom-alert-box ${tipo === 'danger' || tipo === 'warning' ? 'error' : 'success'}`;
  alertBox.innerHTML = `<p class="custom-alert-text">${texto}</p>`;

  container.appendChild(alertBox);

  setTimeout(() => {
    alertBox.style.opacity = '0';
    setTimeout(() => alertBox.remove(), 300);
  }, 4000);

  // Mantener compatibilidad visual con el elemento de texto opcional en pantalla si existe
  const mensajeEl = document.getElementById('mensajeCita');
  if (mensajeEl) {
    mensajeEl.className = 'alert alert-' + tipo;
    mensajeEl.textContent = texto;
  }
}

function normalizarNombre(nombre) {
  return (nombre || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function cargarCitas() {
  const resCitas = await fetch('/api/citas');
  if (!resCitas.ok) throw new Error('No se pudieron cargar las citas.');
  const citas = await resCitas.json();
  citasBD = citas.map(c => ({ ...c, hora: hora24a12(c.hora) }));
}

async function sincronizarBaseDeDatos() {
  try {
    const resMedicos = await fetch('/api/medicos');
    if (!resMedicos.ok) throw new Error('No se pudieron cargar los médicos.');
    medicosBD = await resMedicos.json();
    await cargarCitas();
    errorCarga = false;
  } catch (e) {
    errorCarga = true;
    medicosBD = [];
    citasBD = [];
  }

  llenarEspecialidades();
  llenarMedicos();
  actualizarModuloRecordatorio();
  renderCalendarGrid();
}

function llenarEspecialidades() {
  const sel = document.getElementById('searchSpecialty');
  if (!sel) return;
  const especialidades = [...new Set(medicosBD.map(m => m.especialidad).filter(Boolean))]
    .sort((x, y) => x.localeCompare(y, 'es'));

  sel.innerHTML = '<option value="">Todas las especialidades</option>' +
    especialidades.map(e => `<option value="${escaparHTML(e)}">${escaparHTML(e)}</option>`).join('');
  sel.value = espSel;
}

function llenarMedicos() {
  const sel = document.getElementById('searchMedico');
  if (!sel) return;

  if (!espSel) {
    medSel = '';
    sel.innerHTML = '<option value="">Primero elige una especialidad</option>';
    sel.disabled = true;
    return;
  }

  const doctores = medicosBD.filter(m => m.especialidad === espSel);
  sel.innerHTML = '<option value="">Todos los médicos de ' + escaparHTML(espSel) + '</option>' +
    doctores.map(m => `<option value="${escaparHTML(m._id)}">${escaparHTML(m.nombre)}</option>`).join('');
  sel.disabled = false;
  sel.value = medSel;
}

function alCambiarEspecialidad() {
  espSel = document.getElementById('searchSpecialty').value;
  medSel = '';
  llenarMedicos();
  resetSeleccion(true);
  renderCalendarGrid();
}

function alCambiarMedico() {
  medSel = document.getElementById('searchMedico').value;
  resetSeleccion(true);
  renderCalendarGrid();
}

function resetSeleccion(limpiarMensaje) {
  selectedDoctorId = null;
  selectedDoctorName = null;
  selectedTime = null;
  selectedDateValue = null;
  document.getElementById('citaFecha').value = '';
  document.getElementById('citaDoctorSeleccionado').value = '';
  document.getElementById('btnConfirmarCita').setAttribute('disabled', 'true');
  if (limpiarMensaje) {
    const m = document.getElementById('mensajeCita');
    if (m) {
      m.className = '';
      m.textContent = '';
    }
  }
}

function actualizarGuia() {
  const guia = document.getElementById('guiaPasos');
  if (!guia) return;
  const icono = '<i class="fas fa-info-circle mr-1"></i> ';

  if (errorCarga) {
    guia.className = 'alert alert-danger mb-0 py-2 small';
    guia.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> No se pudo conectar con el servidor. Recarga la página en un momento.';
    return;
  }

  guia.className = 'alert alert-info mb-0 py-2 small';
  const medico = medicosBD.find(m => String(m._id) === medSel);

  if (!espSel) {
    guia.innerHTML = icono + '<strong>Paso 1:</strong> elige una especialidad en el menú de arriba.';
  } else if (!medico) {
    guia.innerHTML = icono + '<strong>Paso 2:</strong> si quieres, elige un médico de <strong>' + escaparHTML(espSel) +
      '</strong>. Después toca un horario disponible del calendario.';
  } else {
    guia.innerHTML = icono + '<strong>Paso 3:</strong> toca un horario disponible para agendar con <strong>' +
      escaparHTML(medico.nombre) + '</strong>.';
  }
}

const ZONA = 'America/Mexico_City';
let citaProxima = null;   
let temporizador = null;

function escaparHTML(texto) {
  return String(texto == null ? '' : texto).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function hora24a12(hhmm) {
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return String(h % 12 || 12).padStart(2, '0') + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
}

function fechaLocalYMD(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function inicioDeCita(cita) {
  return new Date(`${cita.fecha}T${convertirHora(cita.hora)}:00-06:00`);
}

function textoFechaBonito(cita, inicio) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
  const manana = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: ZONA });
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);

  const diaMes = inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: ZONA })
    .replace(/ de (.)/, (m, l) => ' de ' + l.toUpperCase());

  if (cita.fecha === hoy) return `Hoy, ${diaMes}`;
  if (cita.fecha === manana) return `Mañana, ${diaMes}`;

  const dia = mayus(inicio.toLocaleDateString('es-MX', { weekday: 'long', timeZone: ZONA }));
  return `${dia}, ${diaMes}`;
}

function obtenerProximaCita() {
  const ahora = new Date();
  const futuras = citasBD
    .map(cita => ({ cita, inicio: inicioDeCita(cita) }))
    .filter(x => !Number.isNaN(x.inicio.getTime()) && x.inicio > ahora)
    .sort((a, b) => a.inicio - b.inicio);
  return futuras[0] || null;
}

function iniciarCuentaRegresiva(inicio) {
  clearInterval(temporizador);
  const el = document.getElementById('timer');
  if (!el) return;
  const dos = n => String(n).padStart(2, '0');

  function actualizar() {
    const ms = inicio - new Date();
    if (ms <= 0) {
      clearInterval(temporizador);
      actualizarModuloRecordatorio();   
      return;
    }
    const dias = Math.floor(ms / 86400000);
    const horas = Math.floor(ms % 86400000 / 3600000);
    const minutos = Math.floor(ms % 3600000 / 60000);
    const segundos = Math.floor(ms % 60000 / 1000);
    el.textContent = (dias > 0 ? dias + 'd ' : '') +
      `${dos(horas)}h ${dos(minutos)}m ${dos(segundos)}s`;
  }

  actualizar();
  temporizador = setInterval(actualizar, 1000);
}

function actualizarModuloRecordatorio() {
  const proxima = obtenerProximaCita();

  if (!proxima) {
    citaProxima = null;
    clearInterval(temporizador);
    document.getElementById('proximaCitaDoctor').textContent = 'No hay citas próximas';
    document.getElementById('proximaCitaDetalles').textContent = 'Utiliza el calendario de abajo para agendar.';
    document.getElementById('proximaCitaFechaText').textContent = '';
    document.getElementById('proximaCitaHoraText').textContent = '';
    document.getElementById('timer').textContent = '--';
    return;
  }

  const { cita, inicio } = proxima;
  const medico = medicosBD.find(m => String(m._id) === String(cita.medico_id));
  const especialidad = cita.especialidad || (medico && medico.especialidad) || 'Especialista';
  citaProxima = { cita, inicio, especialidad };

  document.getElementById('proximaCitaDoctor').textContent = cita.medico_nombre || (medico && medico.nombre) || 'Dr. Especialista';
  document.getElementById('proximaCitaDetalles').innerHTML =
    `<i class="fas fa-stethoscope text-primary mr-1"></i> ${escaparHTML(especialidad)}`;
  document.getElementById('proximaCitaFechaText').innerHTML =
    `<i class="far fa-calendar-alt text-primary mr-1"></i> ${escaparHTML(textoFechaBonito(cita, inicio))}`;
  document.getElementById('proximaCitaHoraText').innerHTML =
    `<i class="far fa-clock text-primary mr-1"></i> ${escaparHTML(cita.hora)}`;

  iniciarCuentaRegresiva(inicio);
}

function getMonday(d) {
  d = new Date(d);
  let day = d.getDay();
  let diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function changeWeek(direction) {
  currentDate.setDate(currentDate.getDate() + (direction * 7));
  renderCalendarGrid();
}

function currentWeekToday() {
  currentDate = new Date();
  renderCalendarGrid();
}

function medicosFiltrados() {
  return medicosBD.filter(m =>
    (!espSel || m.especialidad === espSel) &&
    (!medSel || String(m._id) === medSel)
  );
}

function medicoOcupado(doc, fechaYMD, hora) {
  return citasBD.some(c =>
    c.fecha === fechaYMD && c.hora === hora && String(c.medico_id) === String(doc._id)
  );
}

function renderCalendarGrid() {
  actualizarGuia();

  const monday = getMonday(currentDate);
  let weekDays = [];

  for (let i = 0; i < 5; i++) {
    let day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDays.push(day);
  }

  const mondayStr = weekDays[0].toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  const fridayStr = weekDays[4].toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('weekRangeLabel').textContent = `${mondayStr} - ${fridayStr}`;

  let headHtml = `<th class="calendar-header-cell"><i class="far fa-clock"></i> Hora</th>`;
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  weekDays.forEach((day, index) => {
    let diaTexto = day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    headHtml += `<th class="calendar-header-cell">${nombresDias[index]} <span class="d-block small text-muted font-weight-normal">${diaTexto}</span></th>`;
  });
  document.getElementById('calendarTableHead').innerHTML = headHtml;

  if (errorCarga || medicosBD.length === 0) {
    document.getElementById('calendarTableBody').innerHTML =
      `<tr><td colspan="6" class="text-center text-muted p-5">` +
      (errorCarga ? 'No se pudo cargar la información del servidor.' : 'Todavía no hay médicos registrados.') +
      `</td></tr>`;
    return;
  }

  const doctores = medicosFiltrados();
  const ahora = new Date();
  let bodyHtml = '';

  horasAgenda.forEach(hora => {
    bodyHtml += `<tr>`;
    bodyHtml += `<td class="calendar-time-col">${hora}</td>`;

    weekDays.forEach(day => {
      const fechaYMD = fechaLocalYMD(day);
      const yaPaso = new Date(`${fechaYMD}T${convertirHora(hora)}:00-06:00`) <= ahora;
      const ocupados = doctores.filter(d => medicoOcupado(d, fechaYMD, hora));
      const libres = (yaPaso || !espSel) ? [] : doctores.filter(d => !medicoOcupado(d, fechaYMD, hora));

      let celda = '';

      libres.forEach(d => {
        const elegido = String(selectedDoctorId) === String(d._id) &&
          selectedTime === hora && selectedDateValue === fechaYMD;
        celda += `
          <div class="slot-event${elegido ? ' selected' : ''}" data-doc="${escaparHTML(d._id)}" data-hora="${hora}" data-fecha="${fechaYMD}">
            <span class="text-primary font-weight-bold small d-block">${escaparHTML(d.nombre)}</span>
          </div>`;
      });

      ocupados.forEach(d => {
        celda += `
          <div class="slot-booked">
            <span class="font-weight-bold text-success small"><i class="fas fa-check-circle"></i> ${escaparHTML(d.nombre)}</span>
          </div>`;
      });

      if (!celda && yaPaso && espSel) {
        celda = `<div class="slot-past" title="Este horario ya pasó"><span class="small">No disponible</span></div>`;
      }

      if (!celda && espSel) {
        celda = `<div class="text-center text-muted small">Sin disponibilidad</div>`;
      }

      bodyHtml += `<td class="calendar-slot-cell" data-date="${fechaYMD}" data-time="${hora}">${celda}</td>`;
    });

    bodyHtml += `</tr>`;
  });

  document.getElementById('calendarTableBody').innerHTML = bodyHtml;
}

function selectTimeSlot(element, doctorId, time, date) {
  if (guardandoCita) return;

  if (new Date(`${date}T${convertirHora(time)}:00-06:00`) <= new Date()) {
    mostrarAlerta('Ese horario ya pasó. Elige uno futuro.', 'warning');
    renderCalendarGrid();
    return;
  }

  const medico = medicosBD.find(m => String(m._id) === String(doctorId));
  if (!medico) return;

  document.querySelectorAll('.slot-event').forEach(slot => {
    slot.classList.remove('selected');
  });

  element.classList.add('selected');

  selectedDoctorId = String(medico._id);
  selectedDoctorName = medico.nombre;
  selectedTime = time;
  selectedDateValue = date;

  document.getElementById('citaFecha').value = selectedDateValue;
  document.getElementById('citaDoctorSeleccionado').value = `${medico.nombre} (${time})`;
  document.getElementById('btnConfirmarCita').removeAttribute('disabled');

  mostrarAlerta(`Seleccionado: ${medico.nombre} el ${date} a las ${time}.`, 'info');
}

function convertirHora(horaTexto) {
  const resultado = horaTexto.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/i);
  if (!resultado) return '10:00';
  let horas = Number(resultado[1]) % 12;
  if (resultado[3].toUpperCase() === 'PM') horas += 12;
  return String(horas).padStart(2, '0') + ':' + resultado[2];
}

async function confirmAppointment() {
  if (guardandoCita || !selectedTime || !selectedDoctorId) return;

  const nombre = document.getElementById('pacienteNombre').value.trim();
  const telefono = document.getElementById('pacienteTelefono').value.trim();
  const fecha = document.getElementById('citaFecha').value;
  const motivo = document.getElementById('citaMotivo').value.trim();

  if (nombre.length < 3 || telefono.length < 7 || !fecha || motivo.length < 3) {
    mostrarAlerta('Por favor completa todos los campos del formulario.', 'warning');
    return;
  }

  guardandoCita = true;
  document.getElementById('btnConfirmarCita').setAttribute('disabled', 'true');
  mostrarAlerta('Guardando cita en la base de datos...', 'info');

  try {
    const respuesta = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre,
        telefono: telefono,
        medico_id: selectedDoctorId,
        fecha: fecha,
        hora: convertirHora(selectedTime),
        motivo_consulta: motivo
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'Error al guardar en el servidor.');
    }

    const medicoCita = medicosBD.find(m => String(m._id) === String(selectedDoctorId));
    citasBD.push({
      _id: datos.cita_id,
      medico_id: selectedDoctorId,
      medico_nombre: selectedDoctorName,
      especialidad: medicoCita ? medicoCita.especialidad : '',
      fecha: fecha,
      hora: selectedTime
    });

    mostrarAlerta('¡Cita guardada con éxito! Folio: ' + datos.cita_id, 'success');

    selectedDoctorId = null;
    selectedDoctorName = null;
    selectedTime = null;
    selectedDateValue = null;
    document.getElementById('citaDoctorSeleccionado').value = '';

    actualizarModuloRecordatorio();
    renderCalendarGrid();

  } catch (error) {
    const sinConexion = error instanceof TypeError;
    mostrarAlerta(
      sinConexion ? 'No se pudo conectar con el servidor. Intenta de nuevo.' : error.message,
      'danger'
    );

    try { await cargarCitas(); } catch (e) { /* mantener lista actual */ }

    if (!sinConexion) {
      resetSeleccion(false);   
    }
    actualizarModuloRecordatorio();
    renderCalendarGrid();
  } finally {
    guardandoCita = false;
  }
}

window.onload = function() {
  const tableBody = document.getElementById('calendarTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', function(e) {
      const slot = e.target.closest('[data-doc]');
      if (slot) selectTimeSlot(slot, slot.dataset.doc, slot.dataset.hora, slot.dataset.fecha);
    });
  }

  sincronizarBaseDeDatos();
};

function enviarCorreoRecordatorio() {
  if (typeof $ !== 'undefined' && $('#modalRecordatorio').length) {
    $('#modalRecordatorio').modal('show');
  }
}

function downloadICS() {
  if (!citaProxima) {
    mostrarAlerta('No hay una cita próxima para agregar al calendario.', 'warning');
    return;
  }

  const formatoUTC = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const inicio = citaProxima.inicio;
  const fin = new Date(inicio.getTime() + 30 * 60000);

  const icsData =
    "BEGIN:VCALENDAR\r\n" +
    "VERSION:2.0\r\n" +
    "PRODID:-//MediPortal//Citas//ES\r\n" +
    "BEGIN:VEVENT\r\n" +
    "UID:" + citaProxima.cita._id + "@mediportal\r\n" +
    "DTSTAMP:" + formatoUTC(new Date()) + "\r\n" +
    "SUMMARY:Cita Médica con " + (citaProxima.cita.medico_nombre || 'Doctor') + "\r\n" +
    "DESCRIPTION:" + citaProxima.especialidad + " - cita agendada en MediPortal\r\n" +
    "DTSTART:" + formatoUTC(inicio) + "\r\n" +
    "DTEND:" + formatoUTC(fin) + "\r\n" +
    "END:VEVENT\r\n" +
    "END:VCALENDAR";

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'cita-medica.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}