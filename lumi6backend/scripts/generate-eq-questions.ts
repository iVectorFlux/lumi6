import fs from 'fs';
import path from 'path';

interface Q {
  text: string;
  type: string;
  module: string;
  submodule: string;
  category: string;
  difficulty: string;
  options: string[];
  score: number;
  inconsistencyPairId?: string;
  isReversed?: boolean;
}

const likert = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
];

const basePairs: Array<{
  id: string;
  positive: string;
  negative: string;
  module: string;
  submodule: string;
  category: string;
}> = [
  {
    id: 'awareness1',
    positive: 'I am aware of my emotions as soon as I feel them.',
    negative: 'I often do not notice my emotions until much later.',
    module: 'Goleman',
    submodule: 'Self-Awareness',
    category: 'Self-Awareness',
  },
  {
    id: 'regulate1',
    positive: 'I remain calm when facing stressful situations.',
    negative: 'I often lose my temper when things are stressful.',
    module: 'Goleman',
    submodule: 'Self-Regulation',
    category: 'Stress Management',
  },
  {
    id: 'empathy1',
    positive: 'I consider other people\'s feelings when making decisions.',
    negative: 'I rarely think about others\' emotions when deciding.',
    module: 'Goleman',
    submodule: 'Empathy',
    category: 'Empathy',
  },
  {
    id: 'manage1',
    positive: 'I can manage my emotions to achieve my goals.',
    negative: 'My emotions often get in the way of what I want to accomplish.',
    module: 'MSCEIT',
    submodule: 'Managing Emotions',
    category: 'Management',
  },
  {
    id: 'use1',
    positive: 'I use my feelings to prioritize important tasks.',
    negative: 'My feelings rarely help me decide what\'s important.',
    module: 'MSCEIT',
    submodule: 'Using Emotions',
    category: 'Facilitation',
  },
  {
    id: 'express1',
    positive: 'I feel confident expressing my ideas to others.',
    negative: 'I find it difficult to share my thoughts and feelings.',
    module: 'EQ-i 2.0',
    submodule: 'Self-Expression',
    category: 'Self-Expression',
  },
  {
    id: 'optimism1',
    positive: 'I remain optimistic in challenging situations.',
    negative: 'I tend to expect the worst when challenges arise.',
    module: 'EQ-i 2.0',
    submodule: 'Stress Management',
    category: 'Optimism',
  },
  {
    id: 'collab1',
    positive: 'I collaborate effectively with my team members.',
    negative: 'Working with others often slows me down.',
    module: 'EQ-i 2.0',
    submodule: 'Interpersonal',
    category: 'Collaboration',
  },
  {
    id: 'adapt1',
    positive: 'I adapt quickly to unexpected changes.',
    negative: 'I struggle to adjust when things change suddenly.',
    module: 'Goleman',
    submodule: 'Self-Regulation',
    category: 'Adaptability',
  },
  {
    id: 'perceive1',
    positive: 'I can accurately read emotions in facial expressions.',
    negative: 'I often misinterpret people\'s facial expressions.',
    module: 'MSCEIT',
    submodule: 'Perceiving Emotions',
    category: 'Perception',
  },
];

const singles: Array<Omit<Q, 'options' | 'score'>> = [
  {
    text: 'I motivate myself to pursue long-term goals.',
    type: 'likert',
    module: 'Goleman',
    submodule: 'Motivation',
    category: 'Motivation',
    difficulty: 'General',
  },
  {
    text: 'I praise others when they perform well.',
    type: 'likert',
    module: 'Goleman',
    submodule: 'Social Skills',
    category: 'Leadership',
    difficulty: 'General',
  },
  {
    text: 'I can explain complex feelings clearly to others.',
    type: 'likert',
    module: 'EQ-i 2.0',
    submodule: 'Self-Expression',
    category: 'Self-Expression',
    difficulty: 'General',
  },
  {
    text: 'I stay focused on tasks even when distracted by emotions.',
    type: 'likert',
    module: 'MSCEIT',
    submodule: 'Using Emotions',
    category: 'Facilitation',
    difficulty: 'General',
  },
  // ... more single questions will be programmatically generated
];

function buildQuestions(): Q[] {
  const list: Q[] = [];

  // Add pairs (2 items each)
  basePairs.forEach((p) => {
    list.push({
      text: p.positive,
      type: 'likert',
      module: p.module,
      submodule: p.submodule,
      category: p.category,
      difficulty: 'General',
      options: likert,
      score: 1,
      inconsistencyPairId: p.id,
      isReversed: false,
    });
    list.push({
      text: p.negative,
      type: 'likert',
      module: p.module,
      submodule: p.submodule,
      category: p.category,
      difficulty: 'General',
      options: likert,
      score: 1,
      inconsistencyPairId: p.id,
      isReversed: true,
    });
  });

  // Generate additional singles to reach 80 total
  const frameworks = ['Goleman', 'MSCEIT', 'EQ-i 2.0'];
  const modules = ['Self-Awareness', 'Self-Regulation', 'Empathy', 'Social Skills', 'Motivation', 'Stress Management'];
  let counter = 1;
  while (list.length < 80) {
    const fw = frameworks[list.length % frameworks.length];
    const mod = modules[list.length % modules.length];
    list.push({
      text: `Sample statement ${counter} about ${mod.toLowerCase()}.`,
      type: 'likert',
      module: fw,
      submodule: mod,
      category: mod,
      difficulty: 'General',
      options: likert,
      score: 1,
    });
    counter++;
  }
  return list;
}

const questions = buildQuestions();
const filePath = path.resolve('./cleaned_eq_questions.json');
fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
console.log(`Generated ${questions.length} EQ questions at ${filePath}`); 