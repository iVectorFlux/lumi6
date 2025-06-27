const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

// Placeholder: Implement your own Google STT and OpenAI API calls
async function transcribeWithGoogle(audioPath) {
  // TODO: Implement Google Speech-to-Text API call
  // Return transcript as string
  return 'This is a mock transcript.';
}

async function evaluateWithGPT4(transcript, question) {
  // TODO: Implement OpenAI GPT-4 API call
  // Return { score, feedback, cefrLevel }
  return {
    score: 85,
    feedback: 'Good fluency and grammar. Some minor errors.',
    cefrLevel: 'B2'
  };
}

async function downloadVideo(url, destPath) {
  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function extractAudio(videoPath, audioPath) {
  execSync(`ffmpeg -y -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`);
}

async function main() {
  const candidateTestId = process.argv[2];
  if (!candidateTestId) {
    console.error('Usage: node batchEvaluateTest.js <candidateTestId>');
    process.exit(1);
  }

  const responses = await prisma.response.findMany({
    where: { candidateTestId },
    include: { question: true }
  });

  for (const response of responses) {
    const videoUrl = response.videoUrl;
    if (!videoUrl) continue;
    const videoFile = path.join(__dirname, `tmp_${response.id}.mp4`);
    const audioFile = path.join(__dirname, `tmp_${response.id}.wav`);

    // Download video if remote (http/https)
    if (videoUrl.startsWith('http')) {
      console.log(`Downloading video for response ${response.id}...`);
      await downloadVideo(videoUrl, videoFile);
    } else {
      // Local file path
      fs.copyFileSync(videoUrl, videoFile);
    }

    // Extract audio
    console.log(`Extracting audio for response ${response.id}...`);
    await extractAudio(videoFile, audioFile);

    // Transcribe
    console.log(`Transcribing audio for response ${response.id}...`);
    const transcript = await transcribeWithGoogle(audioFile);

    // AI Evaluation
    console.log(`Evaluating transcript for response ${response.id}...`);
    const aiResult = await evaluateWithGPT4(transcript, response.question.text);

    // Save results
    await prisma.response.update({
      where: { id: response.id },
      data: {
        transcription: transcript,
        aiScore: aiResult.score,
        aiFeedback: aiResult.feedback,
        cefrLevel: aiResult.cefrLevel
      }
    });

    // Clean up temp files
    fs.unlinkSync(videoFile);
    fs.unlinkSync(audioFile);
  }

  console.log('Batch evaluation complete.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 