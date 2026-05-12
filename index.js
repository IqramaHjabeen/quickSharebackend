// const express = require('express');
// const mongoose = require('mongoose');
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const multer = require('multer');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Cloudinary Configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY,
//   api_secret: process.env.API_SECRET
// });

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.log(err));

// // MongoDB Schema
// const FileSchema = new mongoose.Schema({
//   url: String,
//   name: String,
//   createdAt: { type: Date, default: Date.now }
// });
// const File = mongoose.model('File', FileSchema);

// // Storage Engine
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: { folder: 'file_sharing_app' }
// });
// const upload = multer({ storage: storage });

// // Routes
// app.post('/api/upload', upload.single('file'), async (req, res) => {
//   try {
//     const newFile = await File.create({ url: req.file.path, name: req.file.originalname });
//     res.json(newFile);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get('/api/files', async (req, res) => {
//   const files = await File.find().sort({ createdAt: -1 });
//   res.json(files);
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: "https://quick-share-fontend.vercel.app",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("DB Error:", err));

// ── Schemas ──────────────────────────────────────────

// Text Share (IP based, auto expires 30 min)
const ShareSchema = new mongoose.Schema({
  ip: String,
  text: String,
  createdAt: { type: Date, default: Date.now, expires: 1800 }
});
const Share = mongoose.model('Share', ShareSchema);

// File Share (Cloudinary)
const FileSchema = new mongoose.Schema({
  url: String,
  name: String,
  type: String,
  createdAt: { type: Date, default: Date.now, expires: 1800 }
});
const File = mongoose.model('File', FileSchema);

// ── Multer + Cloudinary Storage ───────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'airforce_share' }
});
const upload = multer({ storage });

// ── Text Routes ───────────────────────────────────────
app.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const data = await Share.findOne({ ip });
    res.json(data || { text: "" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/save', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { text } = req.body;
  try {
    const updated = await Share.findOneAndUpdate(
      { ip },
      { text, createdAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Save Error" });
  }
});

// ── File Routes ───────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const newFile = await File.create({
      url: req.file.path,
      name: req.file.originalname,
      type: req.file.mimetype
    });
    res.json(newFile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    await File.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));