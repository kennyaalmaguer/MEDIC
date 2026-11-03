const express = require('express');
const router = express.Router();
const Paciente = require('../models/paciente.cjs');


router.post('/registro', async (req, res) => {
    try {
        const { nombre, usuario, email, telefono, pass } = req.body;

        if (!nombre || !usuario || !email || !pass) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios por llenar.' });
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

        res.status(201).json({
            success: true,
            message: 'Paciente registrado correctamente en la base de datos',
            expediente: expedienteUnico
        });

    } catch (error) {
        console.error('Error al registrar paciente:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'El correo, el usuario o el expediente ya se encuentran registrados.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el registro.' });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { identificador, pass } = req.body;

        if (!identificador || !pass) {
            return res.status(400).json({ success: false, message: 'Por favor, ingresa tu usuario/correo y contraseña.' });
        }

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
                nombre: paciente.nombre,
                email: paciente.email
            }
        });

    } catch (error) {
        console.error('Error en el login de paciente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar sesión.' });
    }
});

module.exports = router;