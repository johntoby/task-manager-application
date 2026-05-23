require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection using RDS environment variables set by Elastic Beanstalk
const dbConfig = {
  host: process.env.RDS_HOSTNAME || 'localhost',
  user: process.env.RDS_USERNAME || 'admin',
  password: process.env.RDS_PASSWORD || 'password',
  port: process.env.RDS_PORT || 3306,
  database: process.env.RDS_DB_NAME || 'taskdb'
};

const useMemory = process.env.USE_MEMORY === 'true';
let pool;
let tasks = [];
let nextId = 1;

async function initDB() {
  if (useMemory) {
    console.log('Using in-memory storage (no database)');
    return;
  }
  pool = mysql.createPool(dbConfig);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database initialized');
}

// API Routes
app.get('/api/tasks', async (req, res) => {
  if (useMemory) return res.json([...tasks].reverse());
  const [rows] = await pool.execute('SELECT * FROM tasks ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;
  if (useMemory) {
    const task = { id: nextId++, title, completed: false, created_at: new Date() };
    tasks.push(task);
    return res.status(201).json(task);
  }
  const [result] = await pool.execute('INSERT INTO tasks (title) VALUES (?)', [title]);
  res.status(201).json({ id: result.insertId, title, completed: false });
});

app.put('/api/tasks/:id', async (req, res) => {
  const { completed } = req.body;
  if (useMemory) {
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if (task) task.completed = completed;
    return res.json({ message: 'Task updated' });
  }
  await pool.execute('UPDATE tasks SET completed = ? WHERE id = ?', [completed, req.params.id]);
  res.json({ message: 'Task updated' });
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (useMemory) {
    tasks = tasks.filter(t => t.id !== parseInt(req.params.id));
    return res.json({ message: 'Task deleted' });
  }
  await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

const PORT = process.env.PORT || 8080;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
