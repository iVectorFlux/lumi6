import { render, screen, fireEvent } from '@testing-library/react';
import { CandidatesTable } from '../admin/CandidatesTable';
import { vi } from 'vitest';
import { Candidate } from '@/lib/types';

describe('CandidatesTable Component', () => {
  const mockCandidates: Candidate[] = [
    {
      id: '1',
      testId: 'test1',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'completed',
      result: {
        cefrLevel: 'B2',
        overallScore: 85,
        timestamp: '2024-03-17T12:00:00Z'
      }
    },
    {
      id: '2',
      testId: 'test2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'pending',
      result: null
    }
  ];

  const mockOnViewResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the candidates table', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/i)).toBeInTheDocument();
  });

  it('displays correct status for each candidate', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  it('displays CEFR level and score for completed tests', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    expect(screen.getByText(/B2/i)).toBeInTheDocument();
    expect(screen.getByText(/85/i)).toBeInTheDocument();
  });

  it('calls onViewResult when view button is clicked', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    const viewButton = screen.getAllByRole('button', { name: /View/i })[0];
    fireEvent.click(viewButton);

    expect(mockOnViewResult).toHaveBeenCalledWith(mockCandidates[0].id);
  });

  it('disables view button for pending candidates', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    expect(viewButtons[1]).toBeDisabled();
  });

  it('handles empty candidates list', () => {
    render(
      <CandidatesTable
        candidates={[]}
        onViewResult={mockOnViewResult}
      />
    );

    expect(screen.getByText(/No candidates found/i)).toBeInTheDocument();
  });

  it('sorts candidates by name', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
    fireEvent.click(nameHeader);

    const rows = screen.getAllByRole('row');
    const firstRow = rows[1];
    const secondRow = rows[2];

    expect(firstRow).toHaveTextContent('Jane Smith');
    expect(secondRow).toHaveTextContent('John Doe');
  });

  it('filters candidates by status', () => {
    render(
      <CandidatesTable
        candidates={mockCandidates}
        onViewResult={mockOnViewResult}
      />
    );

    const filterSelect = screen.getByRole('combobox', { name: /Status/i });
    fireEvent.change(filterSelect, { target: { value: 'completed' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });
}); 