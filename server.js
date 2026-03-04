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

// Ensure directories exist
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
    limits: { fileSize: 80 * 1024 * 1024 } // 80MB
});

// 📤 Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        const processId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Store process data
        activeProcesses.set(processId, {
            id: processId,
            filename: file.originalname,
            lines: lines,
            totalLines: lines.length,
            processed: 0,
            results: [],
            status: 'processing',
            startTime: new Date()
        });

        // Process with incremental delay
        processWithDelay(processId, lines);

        res.json({
            success: true,
            processId: processId,
            filename: file.originalname,
            totalLines: lines.length,
            message: 'Processing started with 1s increments'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ⏱️ Process with Incremental Delay
function processWithDelay(processId, lines) {
    const process = activeProcesses.get(processId);
    
    lines.forEach((line, index) => {
        const delay = (index + 1) * 1000; // 1s, 2s, 3s...
        
        setTimeout(() => {
            const currentProcess = activeProcesses.get(processId);
            if (!currentProcess) return;
            
            // यहाँ आपका a() function call होगा
            const result = a({
                body: line,
                lineNumber: index + 1,
                totalLines: lines.length,
                delay: delay / 1000
            });
            
            // Store result
            currentProcess.results.push({
                lineNumber: index + 1,
                content: line,
                processedAt: new Date().toISOString(),
                delay: delay / 1000
            });
            
            currentProcess.processed++;
            
            console.log(`✅ Line ${index + 1}/${lines.length} processed after ${delay/1000}s`);
            
            // Check if all lines processed
            if (currentProcess.processed === lines.length) {
                currentProcess.status = 'completed';
                currentProcess.completedAt = new Date();
                
                // Save processed file
                saveProcessedFile(processId);
                
                console.log(`🎉 All ${lines.length} lines processed!`);
            }
        }, delay);
    });
}

// 💾 Save processed file
async function saveProcessedFile(processId) {
    const process = activeProcesses.get(processId);
    if (!process) return;
    
    const outputPath = path.join('processed', `${processId}_processed.txt`);
    
    // Create formatted output
    let output = '';
    process.results.forEach(r => {
        output += `[Line ${r.lineNumber} - ${r.delay}s] ${r.content}\n`;
    });
    
    await fs.writeFile(outputPath, output);
    process.outputPath = outputPath;
}

// 📥 Download endpoint
app.get('/api/download/:processId', async (req, res) => {
    try {
        const process = activeProcesses.get(req.params.processId);
        
        if (!process) {
            return res.status(404).json({ error: 'Process not found' });
        }
        
        if (process.status !== 'completed') {
            return res.status(400).json({ error: 'Processing not completed yet' });
        }
        
        const filePath = process.outputPath;
        const filename = `${path.parse(process.filename).name}_processed.txt`;
        
        res.download(filePath, filename, async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up after download
            setTimeout(() => {
                fs.remove(filePath).catch(console.error);
            }, 5000);
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📊 Status endpoint
app.get('/api/status/:processId', (req, res) => {
    const process = activeProcesses.get(req.params.processId);
    
    if (!process) {
        return res.status(404).json({ error: 'Process not found' });
    }
    
    res.json({
        processId: process.id,
        filename: process.filename,
        totalLines: process.totalLines,
        processed: process.processed,
        status: process.status,
        progress: ((process.processed / process.totalLines) * 100).toFixed(2) + '%',
        results: process.results
    });
});

// 🗑️ Cleanup old processes
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    activeProcesses.forEach((process, id) => {
        if (new Date(process.startTime) < oneHourAgo) {
            if (process.outputPath) {
                fs.remove(process.outputPath).catch(console.error);
            }
            activeProcesses.delete(id);
            console.log(`Cleaned up process: ${id}`);
        }
    });
}, 30 * 60 * 1000);

// 🎯 Your a() function - यहाँ अपना logic डालें
function a(data) {
    console.log(`[${data.delay}s] Line ${data.lineNumber}: ${data.body.substring(0, 50)}`);
    
    // आपकी original functionality
    // जैसे API call, database save, etc.
    
    return {
        status: 'processed',
        line: data.lineNumber,
        content: data.body
    };
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads: ${path.resolve('uploads')}`);
    console.log(`📁 Processed: ${path.resolve('processed')}`);
});