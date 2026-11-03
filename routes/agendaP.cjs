const esId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// Función auxiliar para validar textos
function textoValido(valor, minimo, maximo) {
  return typeof valor === 'string' &&
    valor.trim().length >= minimo &&
    valor.trim().length <= maximo;
}

module.exports = function(db, client) {

  // Obtener los médicos sin exponer contraseñas
  router.get('/medicos', async (req, res) => {
    try {
      const medicos = await db.collection('doctors')
        .find(
          { rol: 'medico', activo: true },
          { projection: { nombre: 1, especialidad: 1 } }
        )
        .toArray();

      res.json(medicos);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        mensaje: 'No se pudieron cargar los médicos.'
      });
    }
  });

  // Guardar una cita
 router.post('/citas', async (req, res) => {
  const { paciente_id, medico_id, fecha, hora, motivo_consulta } = req.body || {};
  const esId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

  if (
    !esId(paciente_id) ||
    !esId(medico_id) ||
    !textoValido(motivo_consulta, 3, 1000) ||
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !['09:00', '10:00', '10:30', '11:00', '13:00', '15:00', '16:00', '16:30', '17:30'].includes(hora)
  ) {
    return res.status(400).json({ mensaje: 'Completa correctamente todos los campos.' });
  }

  const fecha_hora = new Date(`${fecha}T${hora}:00-06:00`);

  if (
    Number.isNaN(fecha_hora.getTime()) ||
    new Date(fecha_hora.getTime() - 6 * 3600000).toISOString().slice(0, 10) !== fecha ||
    fecha_hora <= new Date()
  ) {
    return res.status(400).json({ mensaje: 'Selecciona una fecha y hora futuras y válidas.' });
  }

  const session = client.startSession();
  const pacienteId = new ObjectId(paciente_id);
  const medicoId = new ObjectId(medico_id);
  const citaId = new ObjectId();
  const ahora = new Date();

  try {
    await session.withTransaction(async () => {
      const medico = await db.collection('doctors').findOne(
        { _id: medicoId, rol: 'medico', activo: true },
        { session }
      );
      if (!medico) {
        const error = new Error('El médico no está disponible.');
        error.status = 400;
        throw error;
      }

      const paciente = await db.collection('pacientes').findOne(
        { _id: pacienteId },
        { session }
      );
      if (!paciente) {
        const error = new Error('Paciente no encontrado. Inicia sesión de nuevo.');
        error.status = 400;
        throw error;
      }

      await db.collection('agenda').insertOne({
        _id: citaId,
        paciente_id: pacienteId,
        medico_id: medicoId,
        medico_nombre: medico.nombre,
        especialidad: medico.especialidad,
        fecha,
        hora,
        fecha_hora,
        motivo_consulta: motivo_consulta.trim(),
        estado: 'pendiente',
        creado_en: ahora
      }, { session });
    });

    res.status(201).json({
      mensaje: 'Cita guardada correctamente.',
      cita_id: citaId.toHexString()
    });
  } catch (error) {
    console.error(error.message);

    if (error.code === 11000) {
      return res.status(409).json({ mensaje: 'Ese horario ya está ocupado. Elige otro.' });
    }

    res.status(error.status || 500).json({
      mensaje: error.status ? error.message : 'No se pudo guardar la cita.'
    });
  } finally {
    await session.endSession();
  }

});

  // Agenda del día para el doctor-dashboard
  router.get('/agenda', async (req, res) => {
    const { fecha, medico_id } = req.query;

    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ mensaje: 'Fecha no válida.' });
    }
    if (medico_id !== undefined && !esId(medico_id)) {
      return res.status(400).json({ mensaje: 'Médico no válido.' });
    }

    const filtro = { fecha };
    if (medico_id) filtro.medico_id = new ObjectId(medico_id);

    try {
      const citas = await db.collection('agenda').aggregate([
        { $match: filtro },
        { $sort: { hora: 1 } },
        // Pacientes nuevos ('pacientes') y citas viejas ('paciente')
        { $lookup: { from: 'pacientes', localField: 'paciente_id', foreignField: '_id', as: 'pNuevo' } },
        { $lookup: { from: 'paciente', localField: 'paciente_id', foreignField: '_id', as: 'pViejo' } },
        { $addFields: {
            paciente: {
              $ifNull: [
                { $arrayElemAt: ['$pNuevo', 0] },
                { $arrayElemAt: ['$pViejo', 0] }
              ]
            }
        } },
        { $project: {
            pNuevo: 0,
            pViejo: 0,
            'paciente.pass': 0,
            'paciente.usuario': 0,
            'paciente.email': 0
        } }
      ]).toArray();

      res.json(citas);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ mensaje: 'No se pudo cargar la agenda.' });
    }
  });

  // Finalizar consulta: guarda en 'consultas' y marca la cita como 'completada'
  router.post('/citas/:id/finalizar', async (req, res) => {
    const { id } = req.params;
    const { observaciones, prescripcion } = req.body || {};

    if (
      !esId(id) ||
      !textoValido(observaciones, 3, 5000) ||
      (prescripcion != null && (typeof prescripcion !== 'string' || prescripcion.length > 3000))
    ) {
      return res.status(400).json({ mensaje: 'Escribe las observaciones de la consulta.' });
    }

    const citaId = new ObjectId(id);
    const session = client.startSession();
    const consultaId = new ObjectId();

    try {
      await session.withTransaction(async () => {
        const cita = await db.collection('agenda').findOne({ _id: citaId }, { session });

        if (!cita) {
          const error = new Error('La cita no existe.');
          error.status = 404;
          throw error;
        }
        if (cita.estado === 'completada') {
          const error = new Error('Esta consulta ya fue finalizada.');
          error.status = 409;
          throw error;
        }

        const paciente =
          (await db.collection('pacientes').findOne({ _id: cita.paciente_id }, { session })) ||
          (await db.collection('paciente').findOne({ _id: cita.paciente_id }, { session }));

        const ahora = new Date();

        await db.collection('consultas').insertOne({
          _id: consultaId,
          cita_id: cita._id,
          paciente_id: cita.paciente_id,
          medico_id: cita.medico_id,
          fecha_atencion: ahora,
          motivo_consulta: cita.motivo_consulta,
          antecedentes_al_momento: (paciente && paciente.antecedentes) || '',
          observaciones_evolucion: observaciones.trim(),
          prescripcion_plan_medico: (prescripcion || '').trim(),
          estado: 'Finalizada',
          creado_en: ahora,
          finalizado_en: ahora
        }, { session });

        await db.collection('agenda').updateOne(
          { _id: citaId },
          { $set: { estado: 'completada', finalizada_en: ahora } },
          { session }
        );
      });

      res.status(201).json({
        mensaje: 'Consulta guardada correctamente.',
        consulta_id: consultaId.toHexString()
      });
    } catch (error) {
      console.error(error.message);
      res.status(error.status || 500).json({
        mensaje: error.status ? error.message : 'No se pudo guardar la consulta.'
      });
    } finally {
      await session.endSession();
    }
  });

  return router;
};