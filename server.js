const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

fs.ensureDirSync('uploads');
fs.ensureDirSync('processed');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 80 * 1024 * 1024 }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        lines.forEach((line, index) => {
            setTimeout(() => {
                console.log(`Processed line ${index + 1}/${lines.length} after ${index + 1}s`);
            }, (index + 1) * 1000);
        });

        res.json({
            success: true,
            filename: file.originalname,
            totalLines: lines.length,
            fileSize: file.size
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('🚀 Server is running! Use /api/upload to upload files.');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});