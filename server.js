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

// Store active processes
const activeProcesses = new Map();

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 80 * 1024 * 1024 }, // 80MB
    fileFilter: (req, file, cb) => {
        // Sirf .txt files allow
        if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed!'), false);
        }
    }
});

// 📤 Upload endpoint - FIRE.JS STYLE
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        
        // 🔥 File ka EXACT text padho - symbols ke saath
        const content = await fs.readFile(file.path, 'utf8');
        
        // Lines mein split karo - symbols preserve honge
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        console.log(`📁 Fire.js style - ${lines.length} lines loaded`);
        
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

        // 🔥 FIRE.JS EXACT FORMULA - har line ke saath delay badhega
        lines.forEach((line, index) => {
            // FORMULA: delay = (index + 1) * 1000
            // Yeh exactly fire.js jaisa hai
            const delay = (index + 1) * 1000; // 1000, 2000, 3000, 4000...
            
            setTimeout(() => {
                const currentProcess = activeProcesses.get(processId);
                if (!currentProcess) return;
                
                // 📝 Fire.js style a() function call
                a({
                    body: line,                    // Original line with symbols
                    lineNumber: index + 1,
                    totalLines: lines.length,
                    delay: delay / 1000            // Seconds mein delay
                });
                
                // Store result
                currentProcess.results.push({
                    lineNumber: index + 1,
                    content: line,                  // Exact original text
                    delay: delay / 1000
                });
                
                currentProcess.processed++;
                console.log(`✅ [${delay/1000}s] Line ${index + 1}/${lines.length}`);
                
                // Check if all done
                if (currentProcess.processed === lines.length) {
                    currentProcess.status = 'completed';
                    saveProcessedFile(processId);
                    console.log(`🎉 All ${lines.length} lines processed!`);
                }
            }, delay);
        });

        res.json({
            success: true,
            processId: processId,
            filename: file.originalname,
            totalLines: lines.length,
            message: 'Fire.js style processing started!'
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🔧 a() function - EXACTLY like fire.js
function a(data) {
    console.log(`
    ╔════════════════════════════════╗
    ║ Line ${data.lineNumber}/${data.totalLines} ║
    ║ Delay: ${data.delay}s                ║
    ╚════════════════════════════════╝
    ${data.body.substring(0, 100)}...
    `);
    
    return {
        status: 'processed',
        lineNumber: data.lineNumber,
        delay: data.delay,
        content: data.body
    };
}

// 💾 Save processed file
async function saveProcessedFile(processId) {
    const process = activeProcesses.get(processId);
    if (!process) return;
    
    const outputPath = path.join('processed', `${processId}_processed.txt`);
    let output = '';
    
    // Header
    output += '='.repeat(60) + '\n';
    output += `🔥 FIRE.JS STYLE PROCESSING\n`;
    output += '='.repeat(60) + '\n';
    output += `📁 File: ${process.filename}\n`;
    output += `📊 Lines: ${process.totalLines}\n`;
    output += `⏱️ Completed: ${new Date().toLocaleString()}\n`;
    output += '='.repeat(60) + '\n\n';
    
    // Fire.js style output
    process.results.forEach(r => {
        output += `[Line ${r.lineNumber} - ${r.delay}s]\n`;
        output += `${r.content}\n`;  // Exact original line
        output += '-'.repeat(40) + '\n\n';
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

// Cleanup old files
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    activeProcesses.forEach((process, id) => {
        if (process.startTime && new Date(process.startTime) < oneHourAgo) {
            if (process.outputPath) fs.remove(process.outputPath).catch(console.error);
            activeProcesses.delete(id);
        }
    });
}, 30 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`🚀 Fire.js style server running on port ${PORT}`);
    console.log(`✅ Sabhi symbols support: । ? ! , . ; : " ' @ # $ % ^ & * ( ) - + =`);
});