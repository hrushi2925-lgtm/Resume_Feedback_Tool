const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// Store uploaded files temporarily in an 'uploads' folder
const upload = multer({ dest: 'uploads/' });

app.post('/api/analyze', upload.single('resume'), (req, res) => {
  console.log('File received:', req.file);
  res.json({ message: 'File received successfully!', filename: req.file.originalname });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});