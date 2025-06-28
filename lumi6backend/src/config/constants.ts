export const CEFR_SCORING = {
  'Pre A1': { min: 0, max: 2 },
  'A1': { min: 3, max: 10 },
  'A2': { min: 11, max: 19 },
  'B1': { min: 20, max: 27 },
  'B2': { min: 28, max: 31 },
  'C1': { min: 32, max: 37 },
  'C2': { min: 38, max: 40 }
};

export const API_DEFAULTS = {
  BACKEND_PORT: 4000,
  FRONTEND_URL: 'http://localhost:8080'
};

export const PROFICIENCY_TEST_CONFIG = {
  TOTAL_QUESTIONS: 40,
  PASSWORD_LENGTH: 8
};

export function mapScoreToCEFR(score: number): string {
  for (const [level, range] of Object.entries(CEFR_SCORING)) {
    if (score >= range.min && score <= range.max) {
      return level;
    }
  }
  return 'C2'; // Default to highest level if score exceeds all ranges
} 