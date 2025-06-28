import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../../pages/AdminDashboard';
import { vi } from 'vitest';

// Mock axios for API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        tests: [
          {
            id: '1',
            status: 'active',
            candidates: [
              {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                status: 'completed',
                result: {
                  cefrLevel: 'B2',
                  overallScore: 85
                }
              }
            ]
          }
        ]
      }
    }),
    post: vi.fn().mockResolvedValue({
      data: {
        testId: '2',
        candidateId: '2',
        candidatePassword: 'test123'
      }
    })
  }
}));

describe('AdminDashboard Component', () => {
  const mockAdmin = {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the admin dashboard', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard admin={mockAdmin} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome, Admin User/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Management/i)).toBeInTheDocument();
    
    // Wait for tests to load
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

  it('creates a new test', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard admin={mockAdmin} />
      </BrowserRouter>
    );

    // Open create test dialog
    const createButton = screen.getByRole('button', { name: /Create New Test/i });
    fireEvent.click(createButton);

    // Fill in the form
    const nameInput = screen.getByLabelText(/Candidate Name/i);
    const emailInput = screen.getByLabelText(/Candidate Email/i);

    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Test/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Test created successfully/i)).toBeInTheDocument();
    });
  });

  it('displays test results', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard admin={mockAdmin} />
      </BrowserRouter>
    );

    // Wait for tests to load
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    // Check if results are displayed
    expect(screen.getByText(/B2/i)).toBeInTheDocument();
    expect(screen.getByText(/85/i)).toBeInTheDocument();
  });

  it('handles test creation errors', async () => {
    // Mock axios to reject
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Failed to create test'));

    render(
      <BrowserRouter>
        <AdminDashboard admin={mockAdmin} />
      </BrowserRouter>
    );

    // Open create test dialog
    const createButton = screen.getByRole('button', { name: /Create New Test/i });
    fireEvent.click(createButton);

    // Fill in the form
    const nameInput = screen.getByLabelText(/Candidate Name/i);
    const emailInput = screen.getByLabelText(/Candidate Email/i);

    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Test/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error creating test/i)).toBeInTheDocument();
    });
  });

  it('filters tests by status', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard admin={mockAdmin} />
      </BrowserRouter>
    );

    // Wait for tests to load
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    // Filter by completed status
    const filterSelect = screen.getByLabelText(/Filter by Status/i);
    fireEvent.change(filterSelect, { target: { value: 'completed' } });

    // Check if filtered results are displayed
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });
}); 