const fs = require('fs');
const path = require('path');

// Create public/data directory if it doesn't exist
const publicDataDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
}

// Copy all JSON files from data/analysis to public/data
const sourceDir = path.join(__dirname, '..', '..', 'data', 'analysis');
const files = fs.readdirSync(sourceDir);

files.forEach(file => {
    if (file.endsWith('.json')) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(publicDataDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied ${file} to public/data/`);
    }
}); 