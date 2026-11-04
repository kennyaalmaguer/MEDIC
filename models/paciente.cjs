const mongoose = require('mongoose');

const pacienteSchema = new mongoose.Schema({
  expediente: {
  type: String,
  unique: true,
  default: () => `EXP-${new mongoose.Types.ObjectId().toHexString().toUpperCase()}`
},
  nombre: { type: String, required: true },
  usuario: { type: String, required: true, unique: true }, 
  email: { type: String, required: true, unique: true },
  pass: { type: String, required: true },
  edad: { type: Number },
  fecha_nacimiento: { type: Date },
  genero: { type: String },
  telefono: { type: String },
  antecedentes: { type: String }, 
  creado_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Paciente', pacienteSchema);