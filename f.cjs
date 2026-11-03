require('dotenv').config();

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const carpetaSitio = __dirname;
const client = new MongoClient(process.env.MONGODB_URI);

let db;

app.use(express.json({ limit: '16kb' }));
app.use(express.static(carpetaSitio));
for (const carpeta of ['css', 'images', 'image', 'js', 'plugins']) {
  app.use(
    '/' + carpeta,
    express.static(path.join(carpetaSitio, carpeta))
  );
}

app.get('/patient.html', (req, res) => {
  res.sendFile(path.join(carpetaSitio, 'patient.html'));
});

app.get('/api/estado', async (req, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({ mensaje: 'Conexión con MongoDB correcta' });
  } catch {
    res.status(500).json({ mensaje: 'Error de conexión' });
  }
});

// Obtener los médicos sin exponer contraseñas ni otros datos.
app.get('/api/medicos', async (req, res) => {
  try {
    const medicos = await db.collection('usuario')
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

// Obtener las citas activas con el médico y su especialidad.
// No se envían datos del paciente (nombre, teléfono, motivo).
app.get('/api/citas', async (req, res) => {
  try {
    const citas = await db.collection('citas').aggregate([
      { $match: { estado: { $in: ['pendiente', 'confirmada', 'en_atencion'] } } },
      { $sort: { fecha_hora: 1 } },
      {
        $lookup: {
          from: 'usuario',
          localField: 'medico_id',
          foreignField: '_id',
          as: 'medico'
        }
      },
      { $unwind: '$medico' },
      {
        $project: {
          fecha_hora: 1,
          medico_id: 1,
          'medico.nombre': 1,
          'medico.especialidad': 1
        }
      }
    ]).toArray();

    res.json(citas.map(cita => {
      // Convertir a hora de Ciudad de México (UTC-6).
      const local = new Date(cita.fecha_hora.getTime() - 6 * 3600000)
        .toISOString();

      return {
        _id: cita._id.toHexString(),
        medico_id: cita.medico_id.toHexString(),
        medico_nombre: cita.medico.nombre,
        especialidad: cita.medico.especialidad,
        fecha: local.slice(0, 10),
        hora: local.slice(11, 16)
      };
    }));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      mensaje: 'No se pudieron cargar las citas.'
    });
  }
});

// Agenda de un médico en un día (hora de Ciudad de México).
// Incluye datos del paciente: cuando haya inicio de sesión, esta ruta
// debe exigir que quien consulta sea ese médico.
app.get('/api/agenda', async (req, res) => {
  // Si no se manda medico_id, se devuelven las citas de todos los médicos.
  const { medico_id, fecha } = req.query;

  if (
    (medico_id !== undefined &&
      (typeof medico_id !== 'string' || !/^[a-f0-9]{24}$/i.test(medico_id))) ||
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return res.status(400).json({ mensaje: 'Médico o fecha no válidos.' });
  }

  const inicio = new Date(`${fecha}T00:00:00-06:00`);
  if (Number.isNaN(inicio.getTime())) {
    return res.status(400).json({ mensaje: 'Fecha no válida.' });
  }
  const fin = new Date(inicio.getTime() + 24 * 3600000);

  try {
    const citas = await db.collection('citas').aggregate([
      {
        $match: {
          ...(medico_id ? { medico_id: new ObjectId(medico_id) } : {}),
          fecha_hora: { $gte: inicio, $lt: fin },
          estado: { $in: ['pendiente', 'confirmada', 'en_atencion', 'completada'] }
        }
      },
      { $sort: { fecha_hora: 1 } },
      {
        $lookup: {
          from: 'paciente',
          localField: 'paciente_id',
          foreignField: '_id',
          as: 'paciente'
        }
      },
      { $unwind: { path: '$paciente', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'usuario',
          localField: 'medico_id',
          foreignField: '_id',
          as: 'medico'
        }
      },
      { $unwind: { path: '$medico', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    res.json(citas.map(cita => {
      const local = new Date(cita.fecha_hora.getTime() - 6 * 3600000)
        .toISOString();
      const p = cita.paciente || {};

      return {
        _id: cita._id.toHexString(),
        medico_id: cita.medico_id.toHexString(),
        medico_nombre: (cita.medico && cita.medico.nombre) || '',
        hora: local.slice(11, 16),
        estado: cita.estado,
        motivo_consulta: cita.motivo_consulta || '',
        paciente: {
          nombre: p.nombre || '',
          telefono: p.telefono || '',
          edad: p.edad || null,
          expediente: p.expediente || '',
          antecedentes: p.antecedentes || ''
        }
      };
    }));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ mensaje: 'No se pudo cargar la agenda.' });
  }
});

function textoValido(valor, minimo, maximo) {
  return typeof valor === 'string' &&
    valor.trim().length >= minimo &&
    valor.trim().length <= maximo;
}

// Guardar una cita sin inicio de sesión.
app.post('/api/citas', async (req, res) => {
  const {
    nombre,
    telefono,
    medico_id,
    fecha,
    hora,
    motivo_consulta
  } = req.body || {};

  if (
    !textoValido(nombre, 3, 120) ||
    !textoValido(telefono, 7, 25) ||
    !/^[0-9+()\s-]+$/.test(telefono) ||
    !textoValido(motivo_consulta, 3, 1000) ||
    typeof medico_id !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(medico_id) ||
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !['09:00', '10:00', '10:30', '11:00', '13:00', '15:00', '16:00', '16:30', '17:30'].includes(hora)  ) {
    return res.status(400).json({
      mensaje: 'Completa correctamente todos los campos.'
    });
  }

  // Las horas seleccionadas corresponden a Ciudad de México.
  const fecha_hora = new Date(`${fecha}T${hora}:00-06:00`);

  if (
    Number.isNaN(fecha_hora.getTime()) ||
    new Date(fecha_hora.getTime() - 6 * 3600000)
      .toISOString().slice(0, 10) !== fecha ||
    fecha_hora <= new Date()
  ) {
    return res.status(400).json({
      mensaje: 'Selecciona una fecha y hora futuras y válidas.'
    });
  }

  const session = client.startSession();

  try {
    const pacienteId = new ObjectId();
    const medicoId = new ObjectId(medico_id);
    const citaId = new ObjectId();
    const ahora = new Date();

    await session.withTransaction(async () => {
      const medico = await db.collection('usuario').findOne(
        { _id: medicoId, rol: 'medico', activo: true },
        { session }
      );

      if (!medico) {
        const error = new Error('El médico no está disponible.');
        error.status = 400;
        throw error;
      }

      // En esta primera versión se crea un paciente por reserva.
      await db.collection('paciente').insertOne({
        _id: pacienteId,
        expediente: `EXP-${pacienteId.toHexString().toUpperCase()}`,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        edad: null,
        fecha_nacimiento: null,
        genero: null,
        antecedentes: '',
        creado_en: ahora
      }, { session });

      await db.collection('citas').insertOne({
        _id: citaId,
        paciente_id: pacienteId,
        medico_id: medicoId,
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
      return res.status(409).json({
        mensaje: 'Ese horario ya está ocupado. Elige otro.'
      });
    }

    res.status(error.status || 500).json({
      mensaje: error.status
        ? error.message
        : 'No se pudo guardar la cita.'
    });
  } finally {
    await session.endSession();
  }
});

// El médico finaliza la consulta: se guardan sus notas y la cita pasa a "completada".
app.post('/api/citas/:id/finalizar', async (req, res) => {
  const { medico_id, observaciones, prescripcion } = req.body || {};

  if (
    !/^[a-f0-9]{24}$/i.test(req.params.id) ||
    typeof medico_id !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(medico_id) ||
    !textoValido(observaciones, 3, 5000) ||
    (prescripcion !== undefined &&
      (typeof prescripcion !== 'string' || prescripcion.length > 3000))
  ) {
    return res.status(400).json({
      mensaje: 'Escribe las observaciones de la consulta.'
    });
  }

  try {
    const resultado = await db.collection('citas').updateOne(
      {
        _id: new ObjectId(req.params.id),
        medico_id: new ObjectId(medico_id),
        estado: { $in: ['pendiente', 'confirmada', 'en_atencion'] }
      },
      {
        $set: {
          estado: 'completada',
          observaciones: observaciones.trim(),
          prescripcion: (prescripcion || '').trim(),
          finalizada_en: new Date()
        }
      }
    );

    if (resultado.matchedCount === 0) {
      return res.status(404).json({
        mensaje: 'La cita no existe o ya fue finalizada.'
      });
    }

    res.json({ mensaje: 'Consulta finalizada.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ mensaje: 'No se pudo guardar la consulta.' });
  }
});

async function iniciar() {
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'medic');

  // Evitar dos citas activas con el mismo médico a la misma hora.
  await db.collection('citas').createIndex(
    { medico_id: 1, fecha_hora: 1 },
    {
      unique: true,
      partialFilterExpression: {
        estado: { $in: ['pendiente', 'confirmada', 'en_atencion'] }
      }
    }
  );

  // Médicos de demostración para probar la pantalla.
  const medicos = [
    {
      nombre: 'Dr. Alejandro Morales',
      especialidad: 'Cardiología',
      email: 'alejandro@medic.example'
    },
    {
      nombre: 'Dra. Sofía Ramírez',
      especialidad: 'Dermatología',
      email: 'sofia@medic.example'
    },
    {
      nombre: 'Dr. Carlos Mendoza',
      especialidad: 'Pediatría',
      email: 'carlos@medic.example'
    }
  ];

  for (const medico of medicos) {
    await db.collection('usuario').updateOne(
      { email: medico.email },
      {
        $setOnInsert: {
          ...medico,
          rol: 'medico',
          activo: true,
          telefono: '',
          creado_en: new Date()
        }
      },
      { upsert: true }
    );
  }

  app.listen(3000, '127.0.0.1', () => {
    console.log('Conexión con MongoDB correcta');
    console.log('Servidor: http://localhost:3000');
  });
}

iniciar().catch(error => {
  console.error('Error al iniciar:', error.message);
  process.exitCode = 1;
});
