const express = require('express');
const http = require('http');
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Для обробки form-data
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const app = express();

// Налаштовуємо multer для роботи з form-data
const upload = multer();

app.use(express.text());
app.use(express.urlencoded({ extended: true }));

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'Server host')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <cacheDir>', 'Cache directory path')
  .parse(process.argv);

const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) {
  fs.mkdirSync(cache);
}

const getNotePath = (noteName) => path.join(cache, `${noteName}.txt`);

const listNotes = () => {
  const files = fs.readdirSync(cache);
  const notes = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const note = {
        name: path.basename(file, '.txt'),
        text: fs.readFileSync(path.join(cache, file), 'utf8'),
      };
      notes.push(note);
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  return notes;
};

// Swagger налаштування
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Note API",
      version: "1.0.0",
      description: "API документація для сервісу нотаток",
    },
  },
  apis: ["./main.js"], // Файл, в якому знаходяться Swagger коментарі
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Роут для Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Вітальний текст
 *     responses:
 *       200:
 *         description: Повертає привітання
 */
app.get('/', (req, res) => {
  res.send('Welcome to the Notes API');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати список всіх нотаток
 *     responses:
 *       200:
 *         description: Список нотаток
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */

app.get('/notes', (req, res) => {
  try {
    const notes = listNotes();
    let notesText = '';

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      notesText += `Ім'я нотатки: ${note.name}\nВміст нотатки:\n${note.text}\n\n`;
    }

    res.type('text/plain').send(notesText);
  } catch (error) {
    res.status(500).send('Error listing notes');
  }
});

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Отримати нотатку за іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Назва нотатки
 *     responses:
 *       200:
 *         description: Вміст нотатки
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       404:
 *         description: Нотатку не знайдено
 */
app.get('/notes/:name', (req, res) => {
  const noteName = req.params.name; // Отримуємо ім'я нотатки з параметра
  const notePath = getNotePath(noteName); // Генеруємо шлях до файлу

  // Перевірка, чи існує файл
  if (!fs.existsSync(notePath)) {
    return res.status(404).send(`Note "${noteName}" not found`);
  }

  try {
    const noteContent = fs.readFileSync(notePath, 'utf8');
    res.type('text/plain').send(noteContent); // Надсилаємо вміст
  } catch (error) {
    res.status(500).send('Error reading the note');
  }
});


/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Оновити існуючу нотатку
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Назва нотатки
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *             description: Новий вміст нотатки
 *     responses:
 *       200:
 *         description: Нотатку оновлено
 *       404:
 *         description: Нотатку не знайдено
 */
app.put('/notes/:name', (req, res) => {
  const notePath = getNotePath(req.params.name);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  try {
    fs.writeFileSync(notePath, req.body);
    res.send('Note updated');
  } catch (error) {
    res.status(500).send('Error updating the note');
  }
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Видалити нотатку
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Назва нотатки
 *     responses:
 *       200:
 *         description: Нотатку видалено
 *       404:
 *         description: Нотатку не знайдено
 */
app.delete('/notes/:name', (req, res) => {
  const notePath = getNotePath(req.params.name);

  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  try {
    fs.unlinkSync(notePath);
    res.send('Note deleted');
  } catch (error) {
    res.status(500).send('Error deleting the note');
  }
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Створити нову нотатку
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *                 description: Назва нотатки
 *               note:
 *                 type: string
 *                 description: Вміст нотатки
 *     responses:
 *       201:
 *         description: Нотатку створено
 *       400:
 *         description: Нотатка вже існує
 */
app.post('/write', upload.none(), (req, res) => {
  const { note_name, note } = req.body;
  const notePath = getNotePath(note_name);
  if (fs.existsSync(notePath)) {
    return res.status(400).send('Note already exists');
  }
  try {
    fs.writeFileSync(notePath, note);
    res.status(201).send('Note created');
  } catch (error) {
    res.status(500).send('Error creating the note');
  }
});

app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

const server = http.createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://${host}:${port}/`);
});
