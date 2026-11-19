// routes/Pdashboarth.cjs
const express = require('express');
const router = express.Router();
const { obtenerPerfilPaciente } = require('../api/PdashboarthAPI.cjs');

// GET /api/paciente/perfil?identificador=usuario_o_correo
router.get('/perfil', async (req, res) => {
  try {
    const paciente = await obtenerPerfilPaciente({
      identificador: req.query.identificador
    });

    res.status(200).json({
      success: true,
      usuario: {
        nombre: paciente.nombre,
        usuario: paciente.usuario,
        email: paciente.email,
        telefono: paciente.telefono || '',
        expediente: paciente.expediente || ''
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil del paciente:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor.'
    });
  }
});

module.exports = router;