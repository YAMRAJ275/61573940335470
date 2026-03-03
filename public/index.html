const express = require('express');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Ensure uploads directory exists
fs.ensureDirSync('uploads');
fs.ensureDirSync('processed');

// Multer configuration for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 80 * 1024 * 1024 // 80MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed!'), false);
        }
    }
});

// Store active processes
const activeProcesses = new Map();

// ==================== API ROUTES ====================

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileContent = await fs.readFile(filePath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        const processId = uuidv4();
        
        // Store process info
        activeProcesses.set(processId, {
            id: processId,
            filename: req.file.originalname,
            path: filePath,
            lines: lines,
            totalLines: lines.length,
            processed: 0,
            status: 'processing',
            startTime: new Date(),
            outputPath: null
        });

        // Start processing with delays
        processLinesWithDelay(processId, lines);

        res.json({
            success: true,
            processId: processId,
            filename: req.file.originalname,
            totalLines: lines.length,
            fileSize: req.file.size,
            message: 'File uploaded successfully. Processing started with incremental delays.'
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get process status
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
        startTime: process.startTime,
        outputPath: process.outputPath
    });
});

// Download processed file
app.get('/api/download/:processId/:format', async (req, res) => {
    try {
        const process = activeProcesses.get(req.params.processId);
        const format = req.params.format;

        if (!process) {
            return res.status(404).json({ error: 'Process not found' });
        }

        if (process.status !== 'completed') {
            return res.status(400).json({ error: 'Processing not completed yet' });
        }

        let content = '';
        let filename = '';
        let mimeType = '';

        // Generate content based on format
        switch(format) {
            case 'txt':
                content = process.lines.join('\n');
                filename = `${path.parse(process.filename).name}_processed.txt`;
                mimeType = 'text/plain';
                break;
                
            case 'json':
                content = JSON.stringify({
                    originalFile: process.filename,
                    totalLines: process.totalLines,
                    processedData: process.lines,
                    processedAt: new Date().toISOString(),
                    processId: process.id
                }, null, 2);
                filename = `${path.parse(process.filename).name}_processed.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':
                let csvContent = 'Line Number,Content,Timestamp\n';
                process.lines.forEach((line, index) => {
                    csvContent += `${index + 1},"${line.replace(/"/g, '""')}",${new Date().toISOString()}\n`;
                });
                content = csvContent;
                filename = `${path.parse(process.filename).name}_processed.csv`;
                mimeType = 'text/csv';
                break;
                
            case 'html':
                content = generateHTML(process);
                filename = `${path.parse(process.filename).name}_processed.html`;
                mimeType = 'text/html';
                break;
                
            case 'zip':
                return await createZipDownload(process, res);
                
            default:
                return res.status(400).json({ error: 'Invalid format' });
        }

        // Send file
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all formats
app.get('/api/formats', (req, res) => {
    res.json({
        formats: [
            { id: 'txt', name: 'Text File', icon: '📄', mime: 'text/plain' },
            { id: 'json', name: 'JSON File', icon: '📊', mime: 'application/json' },
            { id: 'csv', name: 'CSV File', icon: '📈', mime: 'text/csv' },
            { id: 'html', name: 'HTML File', icon: '🌐', mime: 'text/html' },
            { id: 'zip', name: 'ZIP Archive', icon: '🗜️', mime: 'application/zip' }
        ]
    });
});

// Delete process
app.delete('/api/process/:processId', async (req, res) => {
    try {
        const process = activeProcesses.get(req.params.processId);
        
        if (process) {
            // Delete uploaded file
            if (process.path && await fs.pathExists(process.path)) {
                await fs.remove(process.path);
            }
            
            // Delete output file if exists
            if (process.outputPath && await fs.pathExists(process.outputPath)) {
                await fs.remove(process.outputPath);
            }
            
            activeProcesses.delete(req.params.processId);
        }
        
        res.json({ success: true, message: 'Process deleted' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== HELPER FUNCTIONS ====================

// Process lines with incremental delay
function processLinesWithDelay(processId, lines) {
    const process = activeProcesses.get(processId);
    
    lines.forEach((line, index) => {
        const delay = (index + 1) * 1000; // 1s, 2s, 3s...
        
        setTimeout(() => {
            const currentProcess = activeProcesses.get(processId);
            if (currentProcess) {
                currentProcess.processed++;
                
                // Log to console
                console.log(`[${processId}] Line ${index + 1}/${lines.length} processed after ${delay/1000}s`);
                
                // Check if all lines processed
                if (currentProcess.processed === lines.length) {
                    currentProcess.status = 'completed';
                    currentProcess.completedAt = new Date();
                    
                    // Save processed file
                    const outputPath = path.join('processed', `${processId}_processed.txt`);
                    fs.writeFileSync(outputPath, lines.join('\n'));
                    currentProcess.outputPath = outputPath;
                    
                    console.log(`[${processId}] Processing completed!`);
                }
            }
        }, delay);
    });
}

// Generate HTML output
function generateHTML(process) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Processed File: ${process.filename}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: #4a5568;
            color: white;
            padding: 25px;
            text-align: center;
        }
        .content {
            padding: 25px;
        }
        .info {
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .line {
            padding: 10px;
            margin: 5px 0;
            background: #f7fafc;
            border-radius: 5px;
            border-left: 3px solid #cbd5e0;
        }
        .line:hover {
            background: #edf2f7;
            border-left-color: #667eea;
        }
        .line-number {
            color: #667eea;
            font-weight: bold;
            margin-right: 10px;
        }
        .footer {
            background: #4a5568;
            color: white;
            padding: 15px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 Processed File: ${process.filename}</h1>
        </div>
        <div class="content">
            <div class="info">
                <p><strong>📊 Total Lines:</strong> ${process.totalLines}</p>
                <p><strong>⏱️ Processed At:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>🆔 Process ID:</strong> ${process.id}</p>
            </div>
            
            <h3>📋 Content:</h3>
            ${process.lines.map((line, index) => `
                <div class="line">
                    <span class="line-number">${index + 1}.</span>
                    <span>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                </div>
            `).join('')}
        </div>
        <div class="footer">
            ⚡ Generated by File Processor Server | ${new Date().toLocaleDateString()}
        </div>
    </div>
</body>
</html>`;
}

// Create ZIP download
async function createZipDownload(process, res) {
    const zipPath = path.join('processed', `${process.id}_archive.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        res.download(zipPath, `${path.parse(process.filename).name}_archive.zip`, async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up zip file after download
            await fs.remove(zipPath);
        });
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);

    // Add files to zip
    archive.append(process.lines.join('\n'), { name: `${path.parse(process.filename).name}_processed.txt` });
    archive.append(JSON.stringify({
        metadata: {
            filename: process.filename,
            totalLines: process.totalLines,
            processedAt: new Date().toISOString(),
            processId: process.id
        },
        data: process.lines
    }, null, 2), { name: 'metadata.json' });
    
    archive.append(generateHTML(process), { name: 'preview.html' });

    await archive.finalize();
}

// Cleanup old processes every hour
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    activeProcesses.forEach((process, id) => {
        if (process.startTime < oneHourAgo) {
            // Delete files
            if (process.path && fs.pathExistsSync(process.path)) {
                fs.removeSync(process.path);
            }
            if (process.outputPath && fs.pathExistsSync(process.outputPath)) {
                fs.removeSync(process.outputPath);
            }
            activeProcesses.delete(id);
            console.log(`Cleaned up old process: ${id}`);
        }
    });
}, 60 * 60 * 1000);

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${path.resolve('uploads')}`);
    console.log(`📁 Processed directory: ${path.resolve('processed')}`);
    console.log(`🌐 http://localhost:${PORT}`);
});