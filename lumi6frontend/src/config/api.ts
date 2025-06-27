import { API_DEFAULTS } from './constants';

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || API_DEFAULTS.BACKEND_URL,
  ENDPOINTS: {
    PROFICIENCY_TESTS: '/api/proficiency-tests',
    COMPANIES: '/api/companies',
    SUPERADMIN: '/api/superadmin',
    COMPANYADMIN: '/api/companyadmin',
    CANDIDATES: '/api/candidates',
    ASSESSMENTS: '/api/assessments',
    EQ_TESTS: '/api/eq'
  }
};

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL}${endpoint}`; 