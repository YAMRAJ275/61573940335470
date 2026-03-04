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
    limits: { fileSize: 80 * 1024 * 1024 } // 80MB
});

// 📤 Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const content = await fs.readFile(file.path, 'utf8');
        
        // Split into lines
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

        // 🔥 YE LO AAPKA REQUESTED CODE:
        // setTimeout(() => {a({body: "file text hoga yh "})} , 1000);
        // aur seconds bhadte jayenge
        
        lines.forEach((line, index) => {
            const seconds = index + 1; // 1, 2, 3, 4, 5...
            const delay = seconds * 1000; // 1000, 2000, 3000...
            
            setTimeout(() => {
                const currentProcess = activeProcesses.get(processId);
                if (!currentProcess) return;
                
                // 📝 a() function call with file text
                const result = a({
                    body: line,                    // "file text hoga yh" ki jagah asli file text
                    lineNumber: seconds,
                    totalLines: lines.length,
                    delay: seconds                  // seconds: 1, 2, 3, 4...
                });
                
                // Store result
                currentProcess.results.push({
                    lineNumber: seconds,
                    content: line,
                    delay: seconds,
                    processedAt: new Date().toISOString()
                });
                
                currentProcess.processed++;
                
                console.log(`✅ Line ${seconds}/${lines.length} - ${seconds}s: ${line.substring(0, 50)}...`);
                
                // Check if all lines processed
                if (currentProcess.processed === lines.length) {
                    currentProcess.status = 'completed';
                    currentProcess.completedAt = new Date();
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
            message: 'Processing started - seconds badhte jayenge!'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔧 a() function - jahan file text use hoga
function a(data) {
    console.log(`
    ╔════════════════════════════════╗
    ║ Line #${data.lineNumber} of ${data.totalLines} ║
    ║ Delay: ${data.delay} second(s)        ║
    ╚════════════════════════════════╝
    Content: ${data.body.substring(0, 100)}
    `);
    
    // 📝 Yeh hai aapka SETTIMEOUT with file text
    // setTimeout(() => {a({body: "file text hoga yh "})} , 1000);
    // Yahan "file text hoga yh" ki jagah asli file ka text aa raha
    
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
    output += '='.repeat(60) + '\n';
    output += '📝 PROCESSED FILE\n';
    output += '='.repeat(60) + '\n\n';
    output += `Original File: ${process.filename}\n`;
    output += `Total Lines: ${process.totalLines}\n`;
    output += `Completed At: ${process.completedAt}\n\n`;
    output += '-'.repeat(60) + '\n\n';
    
    process.results.forEach(r => {
        output += `[Line ${r.lineNumber} - ${r.delay}s] ${r.content}\n`;
        output += '-'.repeat(40) + '\n\n';
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
            if (err) console.error('Download error:', err);
            setTimeout(() => fs.remove(filePath).catch(console.error), 5000);
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
        results: process.results.slice(-5)
    });
});

// Cleanup old processes
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    activeProcesses.forEach((process, id) => {
        if (new Date(process.startTime) < oneHourAgo) {
            if (process.outputPath) fs.remove(process.outputPath).catch(console.error);
            activeProcesses.delete(id);
            console.log(`Cleaned up process: ${id}`);
        }
    });
}, 30 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});