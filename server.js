require('dotenv').config();
const express = require('express');
const path = require('path');

const { pool } = require('./lib/db');
const { ensureSchema } = require('./lib/migrate');
const storeRoutes = require('./routes/store');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
  try {
    await ensureSchema(pool);
    next();
  } catch (err) {
    console.error('Erro ao migrar schema:', err);
    res.status(500).send('Erro ao inicializar banco de dados. Verifique DATABASE_URL.');
  }
});

app.locals.brand = {
  name: 'Pedrinho Outlet',
  slogan: 'Seu novo padrão de estilo começa aqui.',
};

app.use(storeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Loja Pedrinho Outlet rodando em http://localhost:${PORT}`);
});

module.exports = app;
