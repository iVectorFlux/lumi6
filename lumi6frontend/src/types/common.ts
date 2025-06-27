// Base entity interfaces
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// User roles
export type UserRole = 'superadmin' | 'companyadmin' | 'candidate';

// Company related interfaces
export interface Company extends BaseEntity {
  name: string;
  domain: string;
  isActive: boolean;
  adminId: string;
  testPermissions: TestType[];
  creditAllocations: CreditAllocation[];
}

export interface CreditAllocation {
  testType: TestType;
  totalCredits: number;
  usedCredits: number;
}

// Candidate interfaces
export interface Candidate extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  status: CandidateStatus;
  companyId: string;
  testResults: TestResult[];
  overallProgress: string;
  createdBy?: User;
}

export type CandidateStatus = 'active' | 'inactive' | 'completed' | 'in_progress';

// Test related interfaces
export type TestType = 'speaking' | 'proficiency' | 'writing' | 'eq';

export interface TestResult extends BaseEntity {
  candidateId: string;
  testType: TestType;
  status: TestStatus;
  score?: number;
  level?: CEFRLevel;
  completedAt?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export type TestStatus = 'completed' | 'pending' | 'not_taken' | 'in_progress';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Test extends BaseEntity {
  name: string;
  type: TestType;
  companyId: string;
  isActive: boolean;
  settings: TestSettings;
  questions?: Question[];
}

export interface TestSettings {
  duration?: number;
  questionCount?: number;
  randomizeQuestions?: boolean;
  passingScore?: number;
  allowRetake?: boolean;
}

export interface Question extends BaseEntity {
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty?: DifficultyLevel;
  category?: string;
  metadata?: Record<string, any>;
}

export type QuestionType = 'multiple_choice' | 'open_ended' | 'true_false' | 'audio' | 'writing';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// API related interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// UI State interfaces
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface FormState<T = Record<string, any>> extends LoadingState {
  data: T;
  touched: Record<keyof T, boolean>;
  errors: Record<keyof T, string>;
}

// Dashboard interfaces
export interface DashboardStats {
  totalCandidates: number;
  completedTests: number;
  activeTests: number;
  averageScore: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'test_completed' | 'candidate_created' | 'test_created';
  description: string;
  timestamp: string;
  userId?: string;
  candidateId?: string;
}

// Credit system interfaces
export interface CreditBalance {
  testType: TestType;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
}

export interface CreditTransaction extends BaseEntity {
  companyId: string;
  testType: TestType;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  candidateId?: string;
  testId?: string;
}

// Navigation interfaces
export interface NavItem {
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
  badge?: string | number;
  children?: NavItem[];
  requiredPermission?: string;
}

// Component prop interfaces
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginatedResponse<T>['pagination'];
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  className?: string;
}

// Form interfaces
export interface FormFieldProps extends BaseComponentProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Authentication interfaces
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  exp: number;
  iat: number;
}

// Event handlers
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type SubmitHandler<T = Record<string, any>> = (data: T) => void | Promise<void>; 