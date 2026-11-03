// routes/Rpaciente.cjs
// Enrutador backend para gestionar el registro e inicio de sesión de pacientes en MongoDB Atlas
const express = require('express');
const router = express.Router();
const Paciente = require('../models/paciente.cjs');

// ENDPOINT POST: http://localhost:3000/api/pacientes/registro
router.post('/registro', async (req, res) => {
    try {
        const { nombre, usuario, email, telefono, pass } = req.body;

        // Validación básica de campos obligatorios
        if (!nombre || !usuario || !email || !pass) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios por llenar.' });
        }

        const nuevoPaciente = new Paciente({
            nombre,
            usuario,
            email,
            telefono,
            pass 
        });

        await nuevoPaciente.save();

        res.status(201).json({
            success: true,
            message: 'Paciente registrado correctamente en la base de datos'
        });

    } catch (error) {
        console.error('Error al registrar paciente:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'El correo o nombre de usuario ya se encuentran registrados.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el registro.' });
    }
});

// ENDPOINT POST: http://localhost:3000/api/pacientes/login
router.post('/login', async (req, res) => {
    try {
        const { identificador, pass } = req.body;

        if (!identificador || !pass) {
            return res.status(400).json({ success: false, message: 'Por favor, ingresa tu usuario/correo y contraseña.' });
        }

        // Buscar al paciente por email o por usuario
        const paciente = await Paciente.findOne({
            $or: [{ email: identificador }, { usuario: identificador }]
        });

        if (!paciente) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado con esas credenciales.' });
        }

        if (paciente.pass !== pass) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            redirectUrl: 'patient-dashboard.html',
           usuario: {
                _id: paciente._id,
                nombre: paciente.nombre,
                email: paciente.email,
                telefono: paciente.telefono,
                expediente: paciente.expediente
            }
        });

    } catch (error) {
        console.error('Error en el login de paciente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar sesión.' });
    }
});

module.exports = router;