// api/PdashboarthAPI.cjs
const Paciente = require('../models/paciente.cjs');

async function obtenerPerfilPaciente({ identificador } = {}) {
  if (!identificador || typeof identificador !== 'string' || !identificador.trim()) {
    throw { status: 400, message: 'Identificador de paciente requerido.' };
  }

  const limpio = identificador.trim();

  const paciente = await Paciente.findOne(
    {
      $or: [{ usuario: limpio }, { email: limpio }, { nombre: limpio }]
    },
    'nombre usuario email telefono expediente'
  );

  if (!paciente) {
    throw { status: 404, message: 'Paciente no encontrado.' };
  }

  return paciente;
}

module.exports = {
  obtenerPerfilPaciente
};