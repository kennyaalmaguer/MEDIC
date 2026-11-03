const mongoose = require('mongoose');

const agendaSchema = new mongoose.Schema({
  paciente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  medico_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  medico_nombre: { type: String, required: true },
  especialidad: { type: String, required: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  fecha_hora: { type: Date, required: true },
  motivo_consulta: { type: String, required: true },
  estado: { type: String, default: 'pendiente' },
  creado_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agenda', agendaSchema, 'agenda');