// server.cjs
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const carpetaSitio = __dirname;

let db;

// 1. Permite que el servidor procese datos JSON
app.use(express.json({ limit: '16kb' }));

// Configuración de archivos estáticos
app.use(express.static(carpetaSitio));
['css', 'images', 'image', 'js', 'plugins'].forEach(carpeta => {
  app.use('/' + carpeta, express.static(path.join(carpetaSitio, carpeta)));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(carpetaSitio, 'login.html')); 
});

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

// 3. TUS RUTAS (ENDPOINTS) CONECTADAS
app.use('/api/doctores', require('./routes/Rdoctor.cjs'));
app.use('/api/pacientes', require('./routes/Rpaciente.cjs'));

// Función para inicializar base de datos y servidor
async function iniciar() {
  // Conexión única y limpia con Mongoose para tus modelos
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'medic',
    family: 4,
    tlsAllowInvalidCertificates: true
  });

  // Conexión con MongoClient nativo para las transacciones y agendaP.cjs
  const client = new MongoClient(process.env.MONGODB_URI, { 
    family: 4, 
    tlsAllowInvalidCertificates: true 
  });
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'medic');

  // Montar las rutas de agenda pasando la base de datos y el cliente nativo
  app.use('/api', require('./routes/agendaP.cjs')(db, client));

  app.listen(port, '127.0.0.1', () => {
    console.log('Conexión con MongoDB correcta');
    console.log(`Servidor corriendo en: http://localhost:${port}`);
  });
}

iniciar().catch(error => {
  console.error('Error al iniciar:', error.message);
  process.exitCode = 1;
});