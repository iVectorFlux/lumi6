import { processVideoAndEvaluate } from './services/ai';
import path from 'path';
import fs from 'fs';

// Copy a sample video to the uploads directory
const sampleDir = path.join(__dirname, '..', 'test-files');
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Find sample files
const files = fs.readdirSync(sampleDir);
console.log('Available test files:', files);

// Use the first .webm or .mp4 file found
const videoFile = files.find(file => file.endsWith('.webm') || file.endsWith('.mp4'));

if (!videoFile) {
  console.error('No .webm or .mp4 file found in test-files directory');
  process.exit(1);
}

const sourceFile = path.join(sampleDir, videoFile);
const targetFile = path.join(uploadsDir, videoFile);

// Copy the file to uploads
fs.copyFileSync(sourceFile, targetFile);
console.log(`Copied ${sourceFile} to ${targetFile}`);

// Test the processing function
console.log('Starting video processing...');
processVideoAndEvaluate(targetFile)
  .then(result => {
    console.log('Processing successful!');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Processing failed:');
    console.error(err);
  }); 