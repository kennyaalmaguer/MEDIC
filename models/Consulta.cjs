const mongoose = require('mongoose');

const consultaSchema = new mongoose.Schema({
  cita_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agenda' },
  paciente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  medico_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  fecha_atencion: { type: Date, default: Date.now },
  motivo_consulta: { type: String },
  antecedentes_al_momento: { type: String },
  observaciones_evolucion: { type: String, required: true },
  prescripcion_plan_medico: { type: String, default: '' },
  estado: { type: String, default: 'Finalizada' },
  creado_en: { type: Date, default: Date.now },
  finalizado_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Consulta', consultaSchema);