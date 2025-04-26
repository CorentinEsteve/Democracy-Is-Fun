import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from '../LoginPage';
import { AuthContext, AuthProvider } from '../../contexts/AuthContext';
import React from 'react';

// Mock the AuthContext
const mockLogin = vi.fn();
// Initial mock setup, will be updated within tests
let mockAuthContextState = {
  login: mockLogin,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  token: null,
  logout: vi.fn(),
};
const mockUseAuth = vi.fn(() => mockAuthContextState);

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => mockUseAuth(), // Use the mock implementation here
    AuthProvider: actual.AuthProvider, // Keep actual AuthProvider
  };
});

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual, // Preserve other exports like BrowserRouter, Route, Routes
    useNavigate: () => mockNavigate,
  };
});

// Helper to render with providers
const renderLoginPage = () => {
  return render(
    <Router>
        <AuthProvider>
            <LoginPage />
        </AuthProvider>
    </Router>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    // Reset mocks and state before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();
    mockAuthContextState = {
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      logout: vi.fn(),
    };
    mockUseAuth.mockImplementation(() => mockAuthContextState);
  });

  it('renders the login form', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login function and navigates on successful submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined); // Simulate successful login
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/communities');
    });
  });

  it('shows loading state when submitting', async () => {
    let resolveLogin: (value?: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    // Configure the mock login function to update the loading state
    mockLogin.mockImplementation(async () => {
        // Update the mock state immediately to reflect loading
        mockAuthContextState = { ...mockAuthContextState, isLoading: true };
        mockUseAuth.mockImplementation(() => mockAuthContextState);
        // Manually trigger a re-render in the test component if needed, although RTL tries to handle this
        // For complex cases, `rerender` might be used here.
        await loginPromise; // Wait for the promise to resolve
        // After promise resolves, update state back (optional for this specific test)
        // mockAuthContextState = { ...mockAuthContextState, isLoading: false };
        // mockUseAuth.mockImplementation(() => mockAuthContextState);
    });

     const { rerender } = renderLoginPage(); // Initial render

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    // Trigger login, no need to await here as we check the immediate state change
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Re-render with the potentially updated mock state
    // This helps ensure RTL sees the state change reflected by the mock update
    rerender(
        <Router>
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </Router>
    );

    // Check for loading indicator (button text changes and is disabled)
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /logging in.../i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();
    });

    // Clean up: resolve the promise
    await act(async () => {
      resolveLogin!();
    });

  });

   it('displays error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    // Simulate failed login by having mockLogin REJECT the promise
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    // Check for error message display
    await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });

    // Ensure navigation did not happen
    expect(mockNavigate).not.toHaveBeenCalled();
  });
}); 