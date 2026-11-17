// routes/Rpaciente.cjs
const express = require('express');
const router = express.Router();
const { registrarPaciente, loginPaciente } = require('../api/pacienteAPI.cjs');

// Endpoint POST para Registro
router.post('/registro', async (req, res) => {
    try {
        const expedienteUnico = await registrarPaciente(req.body);

        res.status(201).json({
            success: true,
            message: 'Paciente registrado correctamente en la base de datos',
            expediente: expedienteUnico
        });

    } catch (error) {
        console.error('Error al registrar paciente:', error);
        if (error.code === 11000 || error.message?.includes('registrados')) {
            return res.status(400).json({ success: false, message: 'El correo, el usuario o el expediente ya se encuentran registrados.' });
        }
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor al procesar el registro.' });
    }
});

// Endpoint POST para Login
router.post('/login', async (req, res) => {
    try {
        const paciente = await loginPaciente(req.body);

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
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error interno del servidor al iniciar sesión.' });
    }
});

module.exports = router;