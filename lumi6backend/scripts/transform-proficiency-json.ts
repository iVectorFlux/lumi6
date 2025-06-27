import fs from 'fs';
import path from 'path';

// Path to your original JSON file
const inputPath = path.resolve('/Users/Lumi6/Downloads/CEFR_Test_Questions_Combined_40.json');
// Path to output the cleaned JSON
const outputPath = path.resolve('./cleaned_proficiency_questions.json');

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

const cleaned: any[] = [];

for (const [category, questions] of Object.entries(raw)) {
  for (const q of questions as any[]) {
    cleaned.push({
      text: q['Question'],
      type: 'mcq',
      category,
      options: [q['Answer 1'], q['Answer 2'], q['Answer 3'], q['Answer 4']],
      correctAnswer: q['Correct Answer'],
      score: q['Score for Correct Answer'] ?? 1
    });
  }
}

fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2));
console.log(`Transformed ${cleaned.length} questions. Output written to ${outputPath}`); 