const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor.cjs');


router.post('/registro', async (req, res) => {
    try {
        const { nombre, usuario, email, telefono, cedula, especialidad, pass } = req.body;

        if (!nombre || !usuario || !email || !cedula || !pass) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios por llenar.' });
        }

        const nuevoDoctor = new Doctor({
            nombre,
            usuario,
            cedula,
            email,
            telefono,
            pass,
            rol: 'medico', 
            activo: true
        });

        await nuevoDoctor.save();

        res.status(201).json({
            success: true,
            message: 'Médico registrado correctamente en la base de datos'
        });

    } catch (error) {
        console.error('Error al registrar doctor:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'El correo, el usuario o la cédula médica ya se encuentran registrados.' });
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

        const doctor = await Doctor.findOne({
            $or: [{ email: identificador }, { usuario: identificador }]
        });

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Médico no encontrado con esas credenciales.' });
        }

        if (doctor.pass !== pass) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            redirectUrl: 'doctor-dashboard.html', // Página a la que redirige
            usuario: {
                nombre: doctor.nombre,
                email: doctor.email,
                rol: doctor.rol
            }
        });

    } catch (error) {
        console.error('Error en el login de doctor:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar sesión.' });
    }
});

module.exports = router;