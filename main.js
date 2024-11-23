const express = require('express');
const http = require('http');
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Для обробки form-data

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

app.get('/', (req, res) => {
  res.send('Welcome to the Notes API');
});

app.get('/notes/:name', (req, res) => {
  const notePath = getNotePath(req.params.name);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  try {
    const noteContent = fs.readFileSync(notePath, 'utf8');
    res.send(noteContent);
  } catch (error) {
    res.status(500).send('Error reading the note');
  }
});

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

app.delete('/notes/:name', (req, res) => {
  const noteName = decodeURIComponent(req.params.name).trim(); 
  const notePath = getNotePath(noteName);

  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }
  try {
    fs.unlinkSync(notePath);
    res.send('Note deleted');
  } catch (error) {
    res.status(500).send('Error deleting the note');
    console.log(`Error deleting the note`);
  }
});

app.get('/notes', (req, res) => {
  try {
    const notes = listNotes();
    let notesText = '';  // Порожній рядок для зберігання всього тексту нотаток

    // Ітерую через кожну нотатку та додаю її до notesText
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      notesText += `Ім'я нотатки: ${note.name}\nВміст нотатки:\n${note.text}\n\n`;
    }

    res.type('text/plain').send(notesText);
  } catch (error) {
    res.status(500).send('Error listing notes');
  }
});



app.post('/write', upload.none(), (req, res) => { // Використовуємо upload.none() для простого form-data
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

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
