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

// 📤 Upload endpoint with LINE NUMBER EDIT
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { startLine, endLine } = req.body; // Line numbers from frontend
        
        const content = await fs.readFile(file.path, 'utf8');
        
        // Split into lines
        const allLines = content.split('\n').filter(line => line.trim() !== '');
        
        // 🎯 LINE NUMBER EDIT - Select specific lines
        const start = parseInt(startLine) || 1;
        const end = parseInt(endLine) || allLines.length;
        
        // Validate line numbers
        if (start < 1 || end > allLines.length || start > end) {
            return res.status(400).json({ 
                error: `Invalid line numbers. File has ${allLines.length} lines (1-${allLines.length})` 
            });
        }
        
        // Selected lines based on user input
        const selectedLines = allLines.slice(start - 1, end);
        
        const processId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Store process data
        activeProcesses.set(processId, {
            id: processId,
            filename: file.originalname,
            allLines: allLines,
            selectedLines: selectedLines,
            startLine: start,
            endLine: end,
            totalLines: selectedLines.length,
            processed: 0,
            results: [],
            status: 'processing',
            startTime: new Date()
        });

        // 🔥 PROCESS SELECTED LINES WITH INCREMENTAL DELAY
        selectedLines.forEach((line, index) => {
            const actualLineNumber = start + index; // Original line number in file
            const seconds = index + 1; // 1, 2, 3, 4...
            const delay = seconds * 1000; // 1000, 2000, 3000...
            
            setTimeout(() => {
                const currentProcess = activeProcesses.get(processId);
                if (!currentProcess) return;
                
                // 📝 a() function call with file text
                const result = a({
                    body: line,
                    lineNumber: actualLineNumber,  // Original file line number
                    selectedIndex: index + 1,       // Selected list mein position
                    totalSelected: selectedLines.length,
                    delay: seconds
                });
                
                // Store result
                currentProcess.results.push({
                    lineNumber: actualLineNumber,
                    selectedIndex: index + 1,
                    content: line,
                    delay: seconds,
                    processedAt: new Date().toISOString()
                });
                
                currentProcess.processed++;
                
                console.log(`✅ Line ${actualLineNumber} (Selected ${index + 1}/${selectedLines.length}) - ${seconds}s`);
                
                // Check if all selected lines processed
                if (currentProcess.processed === selectedLines.length) {
                    currentProcess.status = 'completed';
                    currentProcess.completedAt = new Date();
                    saveProcessedFile(processId);
                    console.log(`🎉 All ${selectedLines.length} selected lines processed!`);
                }
            }, delay);
        });

        res.json({
            success: true,
            processId: processId,
            filename: file.originalname,
            totalLines: allLines.length,
            selectedRange: `${start} to ${end}`,
            selectedCount: selectedLines.length,
            message: `Processing lines ${start} to ${end} with incremental delay`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔧 a() function
function a(data) {
    console.log(`
    ╔══════════════════════════════════════╗
    ║ File Line #${data.lineNumber} (Selected #${data.selectedIndex}) ║
    ║ Delay: ${data.delay} second(s)               ║
    ╚══════════════════════════════════════╝
    Content: ${data.body.substring(0, 100)}
    `);
    
    return {
        status: 'processed',
        lineNumber: data.lineNumber,
        selectedIndex: data.selectedIndex,
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
    output += '📝 PROCESSED FILE (Selected Lines Only)\n';
    output += '='.repeat(60) + '\n\n';
    output += `Original File: ${process.filename}\n`;
    output += `Total Lines in File: ${process.allLines.length}\n`;
    output += `Selected Range: Lines ${process.startLine} to ${process.endLine}\n`;
    output += `Selected Count: ${process.totalLines}\n`;
    output += `Completed At: ${process.completedAt}\n\n`;
    output += '-'.repeat(60) + '\n\n';
    
    process.results.forEach(r => {
        output += `[File Line ${r.lineNumber} - Selected #${r.selectedIndex} - ${r.delay}s]\n`;
        output += `${r.content}\n`;
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
        const filename = `${path.parse(process.filename).name}_lines_${process.startLine}-${process.endLine}.txt`;
        
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
        totalLines: process.allLines.length,
        selectedRange: `${process.startLine} to ${process.endLine}`,
        selectedCount: process.totalLines,
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