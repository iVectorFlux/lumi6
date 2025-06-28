import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import './App.css';

// Lazy load components for better performance
const NotFound = lazy(() => import('./pages/NotFound'));

// Candidate pages
const CandidateTest = lazy(() => import('./pages/candidate/CandidateTest'));
const Results = lazy(() => import('./pages/candidate/Results'));
const ProficiencyCandidateTest = lazy(() => import('./pages/candidate/ProficiencyCandidateTest'));
const EQCandidateTest = lazy(() => import('./pages/candidate/EQCandidateTest'));
const WritingCandidateTest = lazy(() => import('./pages/candidate/WritingCandidateTest'));

// Super Admin pages
const SuperAdminIndex = lazy(() => import('./pages/superadmin/index'));
const SuperAdminLayout = lazy(() => import('./components/superadmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const SuperAdminLogin = lazy(() => import('./pages/superadmin/Login'));
const SuperAdminCompanies = lazy(() => import('./pages/superadmin/Companies'));
const SuperAdminCandidates = lazy(() => import('./pages/superadmin/Candidates'));
const SuperAdminAssessments = lazy(() => import('./pages/superadmin/Assessments'));
const QuestionManagement = lazy(() => import('./pages/superadmin/QuestionManagement'));

// Company Admin pages
const CompanyAdminDashboard = lazy(() => import('./pages/companyadmin/CompanyDashboard'));
const CompanySignup = lazy(() => import('./pages/companyadmin/CompanySignup'));
const CompanyAdminLogin = lazy(() => import('./pages/companyadmin/Login'));

// Common components (keep these as regular imports since they're used frequently)
import ProtectedRoute from './components/common/ProtectedRoute';

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <Routes>
          {/* Redirect root to company admin login */}
          <Route path="/" element={<Navigate to="/companyadmin/login" replace />} />
          {/* Candidate test and results */}
          <Route path="/test/:testId?" element={<CandidateTest />} />
          <Route path="/results/:assessmentId" element={<Results />} />
          <Route path="/proficiency-test/:testId" element={<ProficiencyCandidateTest />} />
          <Route path="/eq-test/:testId" element={<EQCandidateTest />} />
          <Route path="/candidate/writing-test/:testId" element={<WritingCandidateTest />} />
          {/* Super Admin Routes - protected */}
          <Route 
            path="/superadmin/dashboard" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin/companies" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><SuperAdminCompanies /></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin/candidates" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><SuperAdminCandidates /></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/superadmin/assessments" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><SuperAdminAssessments /></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin/reports" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><div>Reports (Coming soon)</div></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin/analytics" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><div>Analytics (Coming soon)</div></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin/settings" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><div>Settings (Coming soon)</div></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/superadmin/questions" 
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminLayout><QuestionManagement /></SuperAdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route path="/superadmin" element={<SuperAdminIndex />} />
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          
          {/* Company Admin Routes - protected */}
          <Route 
            path="/companyadmin/dashboard" 
            element={
              <ProtectedRoute requiredRole="companyadmin">
                <CompanyAdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route path="/companyadmin/signup" element={<CompanySignup />} />
          <Route path="/companyadmin/login" element={<CompanyAdminLogin />} />
          
          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
