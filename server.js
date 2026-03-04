const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure directories
fs.ensureDirSync('uploads');
fs.ensureDirSync('processed');

// Store processes
const activeProcesses = new Map();

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 80 * 1024 * 1024 }
});

// 📤 Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const content = await fs.readFile(file.path, 'utf8');
        
        // Split into lines
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        const processId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Store process
        activeProcesses.set(processId, {
            id: processId,
            filename: file.originalname,
            lines: lines,
            totalLines: lines.length,
            processed: 0,
            results: [],
            status: 'processing'
        });

        // 🔥 YOUR EXACT REQUIREMENT:
        // setTimeout(() => {a({body: "पेस्ट करो"})} , 1000);
        // Yahan "पेस्ट करो" ki jagah file ka text aa raha hai
        // Aur 1000 har line ke saath badh raha hai (1000, 2000, 3000...)
        
        lines.forEach((line, index) => {
            const delay = (index + 1) * 1000; // 1000, 2000, 3000...
            
            setTimeout(() => {
                const currentProcess = activeProcesses.get(processId);
                if (!currentProcess) return;
                
                // 📝 a() function call with file text
                a({
                    body: line,                    // "पेस्ट करो" ki jagah file ka text
                    lineNumber: index + 1,
                    totalLines: lines.length,
                    delay: delay / 1000
                });
                
                // Store result
                currentProcess.results.push({
                    lineNumber: index + 1,
                    content: line,
                    delay: delay / 1000
                });
                
                currentProcess.processed++;
                console.log(`✅ Line ${index + 1}: ${line.substring(0, 50)}... (${delay/1000}s)`);
                
                // Check if all done
                if (currentProcess.processed === lines.length) {
                    currentProcess.status = 'completed';
                    saveProcessedFile(processId);
                }
            }, delay);
        });

        res.json({
            success: true,
            processId: processId,
            totalLines: lines.length,
            message: 'Processing started - 1s, 2s, 3s...'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔧 a() function
function a(data) {
    console.log(`Line ${data.lineNumber}: ${data.body.substring(0, 100)} (${data.delay}s)`);
    return { status: 'processed' };
}

// 💾 Save processed file
async function saveProcessedFile(processId) {
    const process = activeProcesses.get(processId);
    if (!process) return;
    
    const outputPath = path.join('processed', `${processId}_processed.txt`);
    let output = '';
    
    process.results.forEach(r => {
        output += `[Line ${r.lineNumber} - ${r.delay}s]\n`;
        output += `${r.content}\n\n`;
    });
    
    await fs.writeFile(outputPath, output);
    process.outputPath = outputPath;
}

// 📥 Download endpoint
app.get('/api/download/:processId', async (req, res) => {
    const process = activeProcesses.get(req.params.processId);
    if (!process || process.status !== 'completed') {
        return res.status(404).json({ error: 'File not ready' });
    }
    res.download(process.outputPath);
});

// 📊 Status endpoint
app.get('/api/status/:processId', (req, res) => {
    const process = activeProcesses.get(req.params.processId);
    if (!process) return res.status(404).json({ error: 'Not found' });
    
    res.json({
        processed: process.processed,
        total: process.totalLines,
        status: process.status,
        results: process.results.slice(-5)
    });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));