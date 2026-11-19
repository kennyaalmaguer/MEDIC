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
  }// api/PdashboarthAPI.cjs
const Paciente = require('../models/paciente.cjs');

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function obtenerPerfilPaciente({ identificador } = {}) {
  if (!identificador || typeof identificador !== 'string' || !identificador.trim()) {
    throw { status: 400, message: 'Identificador de paciente requerido.' };
  }

  const limpio = identificador.trim();
  const regexExacto = new RegExp(`^${escaparRegex(limpio)}$`, 'i');

  const paciente = await Paciente.findOne(
    {
      $or: [
        { usuario: regexExacto },
        { email: regexExacto },
        { nombre: regexExacto },
        { expediente: regexExacto }
      ]
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

  return paciente;
}

module.exports = {
  obtenerPerfilPaciente
};