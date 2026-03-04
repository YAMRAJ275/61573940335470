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
        
        // Split into sentences (।, ., ?, !, \n से)
        const sentences = content
            .split(/(?<=[.!?।])\s+|\n+/)
            .filter(s => s.trim().length > 0);
        
        const processId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Store process data
        activeProcesses.set(processId, {
            id: processId,
            filename: file.originalname,
            sentences: sentences,
            totalSentences: sentences.length,
            processed: 0,
            results: [],
            status: 'processing',
            startTime: new Date()
        });

        // ⏱️ यहाँ हर sentence को अलग delay पर process करेंगे
        sentences.forEach((sentence, index) => {
            const delay = (index + 1) * 1000; // 1s, 2s, 3s, 4s...
            
            setTimeout(() => {
                const currentProcess = activeProcesses.get(processId);
                if (!currentProcess) return;
                
                // 📝 a() function call - हर sentence के लिए
                const result = a({
                    body: sentence,
                    sentenceNumber: index + 1,
                    totalSentences: sentences.length,
                    delay: delay / 1000
                });
                
                // Store result
                currentProcess.results.push({
                    sentenceNumber: index + 1,
                    content: sentence,
                    delay: delay / 1000,
                    processedAt: new Date().toISOString()
                });
                
                currentProcess.processed++;
                
                console.log(`✅ Sentence ${index + 1}/${sentences.length} - ${delay/1000}s: ${sentence.substring(0, 50)}...`);
                
                // Check if all sentences processed
                if (currentProcess.processed === sentences.length) {
                    currentProcess.status = 'completed';
                    currentProcess.completedAt = new Date();
                    
                    // Save processed file
                    saveProcessedFile(processId);
                    
                    console.log(`🎉 All ${sentences.length} sentences processed!`);
                }
            }, delay);
        });

        res.json({
            success: true,
            processId: processId,
            filename: file.originalname,
            totalSentences: sentences.length,
            message: 'Processing started with 1s increments'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔧 a() function - यहाँ अपना logic लिखें
function a(data) {
    console.log(`
    ╔════════════════════════════════╗
    ║ Sentence #${data.sentenceNumber} of ${data.totalSentences} ║
    ║ Delay: ${data.delay}s                ║
    ╚════════════════════════════════╝
    Content: ${data.body.substring(0, 100)}
    `);
    
    // आपकी custom functionality
    // API call, database save, etc.
    
    return {
        status: 'processed',
        sentenceNumber: data.sentenceNumber,
        delay: data.delay
    };
}

// 💾 Save processed file
async function saveProcessedFile(processId) {
    const process = activeProcesses.get(processId);
    if (!process) return;
    
    const outputPath = path.join('processed', `${processId}_processed.txt`);
    
    let output = '';
    output += '='.repeat(60) + '\n';
    output += '📝 PROCESSED SENTENCES\n';
    output += '='.repeat(60) + '\n\n';
    
    process.results.forEach(r => {
        output += `[Sentence ${r.sentenceNumber} - ${r.delay}s]\n`;
        output += `${r.content}\n`;
        output += '-'.repeat(40) + '\n\n';
    });
    
    output += '='.repeat(60) + '\n';
    output += `✅ Total Sentences: ${process.totalSentences}\n`;
    output += `✅ Completed at: ${process.completedAt}\n`;
    output += '='.repeat(60) + '\n';
    
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
            // Clean up after 5 seconds
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
        totalSentences: process.totalSentences,
        processed: process.processed,
        status: process.status,
        progress: ((process.processed / process.totalSentences) * 100).toFixed(2) + '%',
        results: process.results
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