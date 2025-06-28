import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TestSession from '../../pages/candidate/TestSession';
import { vi } from 'vitest';

// Mock the video recording functionality
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
};

const mockMediaStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

// Mock the browser's MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
};

// Mock axios for API calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('TestSession Component', () => {
  const mockCandidate = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    testId: 'test1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the test session interface', () => {
    render(
      <BrowserRouter>
        <TestSession candidate={mockCandidate} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome, John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Recording/i })).toBeInTheDocument();
  });

  it('handles recording start and stop', async () => {
    render(
      <BrowserRouter>
        <TestSession candidate={mockCandidate} />
      </BrowserRouter>
    );

    // Start recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockMediaRecorder.start).toHaveBeenCalled();
      expect(screen.getByText(/Recording in progress/i)).toBeInTheDocument();
    });

    // Stop recording
    const stopButton = screen.getByRole('button', { name: /Stop Recording/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(screen.getByText(/Recording completed/i)).toBeInTheDocument();
    });
  });

  it('handles recording errors gracefully', async () => {
    // Mock getUserMedia to reject
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));

    render(
      <BrowserRouter>
        <TestSession candidate={mockCandidate} />
      </BrowserRouter>
    );

    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Error accessing camera/i)).toBeInTheDocument();
    });
  });

  it('submits the test successfully', async () => {
    render(
      <BrowserRouter>
        <TestSession candidate={mockCandidate} />
      </BrowserRouter>
    );

    // Start and stop recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    fireEvent.click(startButton);
    const stopButton = screen.getByRole('button', { name: /Stop Recording/i });
    fireEvent.click(stopButton);

    // Submit the test
    const submitButton = screen.getByRole('button', { name: /Submit Test/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Test submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    render(
      <BrowserRouter>
        <TestSession candidate={mockCandidate} />
      </BrowserRouter>
    );

    // Start and stop recording
    const startButton = screen.getByRole('button', { name: /Start Recording/i });
    fireEvent.click(startButton);
    const stopButton = screen.getByRole('button', { name: /Stop Recording/i });
    fireEvent.click(stopButton);

    // Submit the test
    const submitButton = screen.getByRole('button', { name: /Submit Test/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Submitting test/i)).toBeInTheDocument();
  });
}); 