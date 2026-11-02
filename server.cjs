require('dotenv').config();

//const dns = require('node:dns');
//dns.setServers(['8.8.8.8', '8.8.4.4']);


const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose'); // Importante para tus modelos de Mongoose

const app = express();
const carpetaSitio = __dirname;
const client = new MongoClient(process.env.MONGODB_URI, { family: 4 });

let db;

// 1. ESTO ES VITAL: Permite que el servidor procese datos JSON
app.use(express.json({ limit: '16kb' }));

// Configuración de archivos estáticos
app.use(express.static(carpetaSitio));
for (const carpeta of ['css', 'images', 'image', 'js', 'plugins']) {
  app.use(
    '/' + carpeta,
    express.static(path.join(carpetaSitio, carpeta))
  );
}

// Ruta para el dashboard del paciente
app.get('/patient-dashboard.html', (req, res) => {
  res.sendFile(path.join(carpetaSitio, 'patient-dashboard.html'));
});

// Comprobación de estado de conexión
app.get('/api/estado', async (req, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({ mensaje: 'Conexión con MongoDB correcta' });
  } catch {
    res.status(500).json({ mensaje: 'Error de conexión' });
  }
});

// 2. TUS RUTAS (ENDPOINTS) CONECTADAS
app.use('/api/doctores', require('./routes/Rdoctor.cjs'));
app.use('/api/pacientes', require('./routes/Rpaciente.cjs'));

// Función para inicializar base de datos y servidor
async function iniciar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'medic',
    family: 4
  });
  // Conexión con MongoClient nativo para las transacciones y agenda
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'medic');

  // Conexión paralela con Mongoose (para que funcionen tus modelos .cjs de doctores y pacientes)
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'medic'
  });

  // Montar las rutas de agenda pasando la base de datos
  app.use('/api', require('./routes/agendaP.cjs')(db, client));

  // Crear índices necesarios para citas
  await db.collection('citas').createIndex(
    { medico_id: 1, fecha_hora: 1 },
    {
      unique: true,
      partialFilterExpression: {
        estado: { $in: ['pendiente', 'confirmada', 'en_atencion'] }
      }
    }
  );

  // Médicos de demostración iniciales
  const medicosDemo = [
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

  for (const medico of medicosDemo) {
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