const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, required: true, unique: true }, 
  cedula: { type: String, required: true, unique: true },   
  email: { type: String, required: true, unique: true },
  pass: { type: String, required: true }, 
  rol: { type: String, default: 'medico' }, 
  telefono: { type: String },
  activo: { type: Boolean, default: true },
  creado_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);