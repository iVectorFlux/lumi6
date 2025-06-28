import { processVideoAndEvaluate } from '../services/ai';
import path from 'path';

async function testVideoProcessing() {
  try {
    // Replace this with the path to your test WebM file
    const testVideoPath = path.join(__dirname, '../../test-files/test-video.webm');
    
    console.log('Starting video processing test...');
    console.log('Using video file:', testVideoPath);
    
    const result = await processVideoAndEvaluate(testVideoPath);
    
    console.log('\nEvaluation Results:');
    console.log('------------------');
    console.log('CEFR Level:', result.cefrLevel);
    console.log('Overall Score:', result.overallScore);
    console.log('Speaking Score:', result.speakingScore);
    console.log('Fluency Score:', result.fluencyScore);
    console.log('Pronunciation Score:', result.pronunciationScore);
    console.log('Grammar Score:', result.grammarScore);
    console.log('Vocabulary Score:', result.vocabularyScore);
    
    console.log('\nDetailed Analysis:');
    console.log('Strengths:', result.detailedAnalysis.strengths);
    console.log('Weaknesses:', result.detailedAnalysis.weaknesses);
    console.log('Recommendations:', result.detailedAnalysis.recommendations);
    
    console.log('\nConfidence Score:', result.confidenceScore);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testVideoProcessing(); 