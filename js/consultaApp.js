
let activeSlotId = null;
let currentPatientData = {};

// Abrir panel dividido y capturar datos del paciente seleccionado
function openConsultation(name, meta, exp, history, reason, slotId) {
    currentPatientData = { name, meta, exp, history, reason };
    
    document.getElementById('patientName').textContent = name;
    document.getElementById('patientMeta').textContent = meta + ' | Expediente: ' + exp;
    document.getElementById('patientHistory').textContent = history;
    document.getElementById('patientReason').textContent = reason;

    if (activeSlotId) {
        document.getElementById(activeSlotId).classList.remove('selected-slot');
    }
    activeSlotId = slotId;
    document.getElementById(slotId).classList.add('selected-slot');

    document.getElementById('calendarColumn').className = 'col-lg-6';
    document.getElementById('consultationColumn').style.display = 'block';
    document.getElementById('consultationPanel').style.display = 'block';
}

// Cerrar panel dividido
function closeConsultation() {
    if (activeSlotId) {
        document.getElementById(activeSlotId).classList.remove('selected-slot');
    }
    document.getElementById('calendarColumn').className = 'col-lg-12';
    document.getElementById('consultationPanel').style.display = 'none';
}

// Finalizar consulta y guardar en MongoDB a través del Endpoint
async function finishConsultation(e) {
    e.preventDefault();

    // Capturar valores de los Textareas del formulario
    const observaciones = document.getElementById('observacionesInput').value;
    const prescripcion = document.getElementById('prescripcionInput').value;

    const payload = {
        paciente_id: currentPatientData.exp || "EXP-0000",
        medico_id: "DR-ALEJANDRO-MORALES", // Identificador de ejemplo del doctor en sesión
        motivo_consulta: currentPatientData.reason,
        antecedentes_al_momento: currentPatientData.history,
        observaciones_evolucion: observaciones,
        prescripcion_plan_medico: prescripcion,
        estado: "Finalizada"
    };

    try {
        const response = await fetch('http://localhost:3000/api/consultas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            alert('¡Consulta guardada exitosamente en MongoDB!');
            
            const counterEl = document.getElementById('weeklyCounter');
            let currentVal = parseInt(counterEl.textContent);
            counterEl.childNodes[0].textContent = (currentVal + 1) + ' ';

            e.target.reset();
            closeConsultation();
        } else {
            alert('Error al guardar: ' + (result.message || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('No se pudo conectar con el servidor para guardar la consulta.');
    }
}

// Filtrar fecha
function filterDate(val) {
    document.getElementById('selectedDateTitle').innerHTML = '<i class="far fa-calendar-alt mr-2"></i> Citas para: ' + val;
    closeConsultation();
}

// Regresar a HOY
function resetToday() {
    document.getElementById('agendaDate').value = '2026-09-15';
    filterDate('2026-09-15');
}