// api/pacienteAPI.cjs
const Paciente = require('../models/paciente.cjs');

// Lógica para registrar un paciente
async function registrarPaciente(datos) {
    const { nombre, usuario, email, telefono, pass } = datos;

    if (!nombre || !usuario || !email || !pass) {
        throw { status: 400, message: 'Faltan campos obligatorios por llenar.' };
    }

    const expedienteUnico = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const nuevoPaciente = new Paciente({
        expediente: expedienteUnico,
        nombre,
        usuario,
        email,
        telefono,
        pass 
    });

    await nuevoPaciente.save();
    return expedienteUnico;
}

// Lógica para autenticar (login) un paciente
async function loginPaciente(credenciales) {
    const { identificador, pass } = credenciales;

    if (!identificador || !pass) {
        throw { status: 400, message: 'Por favor, ingresa tu usuario/correo y contraseña.' };
    }

    const paciente = await Paciente.findOne({
        $or: [{ email: identificador }, { usuario: identificador }]
    });

    if (!paciente) {
        throw { status: 404, message: 'Paciente no encontrado con esas credenciales.' };
    }

    if (paciente.pass !== pass) {
        throw { status: 401, message: 'Contraseña incorrecta.' };
    }

    return paciente;
}

module.exports = {
    registrarPaciente,
    loginPaciente
};