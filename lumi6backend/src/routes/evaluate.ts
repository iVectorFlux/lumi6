import express from 'express';
import multer from 'multer';
import { processVideoAndEvaluate } from '../services/ai';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// POST /api/evaluate-video
router.post('/evaluate-video', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File uploaded:', req.file.path);
    const filePath = req.file.path;
    
    try {
      console.log('Calling processVideoAndEvaluate...');
      const result = await processVideoAndEvaluate(filePath);
      console.log('Evaluation completed successfully');
      res.json(result);
    } catch (evalError: any) {
      console.error('Error in processVideoAndEvaluate:', evalError);
      console.error('Error details:', evalError.stack);
      res.status(500).json({ error: evalError.message, details: "Error during video processing and evaluation" });
    }
  } catch (err: any) {
    console.error('Outer error in endpoint:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message, details: "Error handling the request" });
  }
});

export default router; 