import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import RegisterPage from '@/pages/RegisterPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import React from 'react';

// Mock the useAuth hook partially
const mockSignup = vi.fn();
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/contexts/AuthContext')>();
    return {
        ...actual,
        useAuth: () => ({
            ...(actual.useAuth()), // Preserve other context values if needed
            signup: mockSignup,
        }),
    };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, toasts: [] }),
}));

const queryClient = new QueryClient();

const renderRegisterPage = () => {
    const user = userEvent.setup();
    const utils = render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter> { /* Needed for useNavigate */} 
                <AuthProvider> { /* Need actual provider for context */} 
                    <RegisterPage />
                    <Toaster />
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
    return { ...utils, user };
};

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the registration form', () => {
        renderRegisterPage();
        expect(screen.getByText(/register/i, { selector: 'div' })).toBeInTheDocument();
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    it('shows validation errors for invalid input', async () => {
        const { user } = renderRegisterPage();
        const registerButton = screen.getByRole('button', { name: /register/i });

        await user.click(registerButton);

        expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
        expect(mockSignup).not.toHaveBeenCalled();
    });

    it('calls signup and navigates on successful registration', async () => {
        mockSignup.mockResolvedValueOnce(undefined); // Simulate successful signup
        const { user } = renderRegisterPage();

        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const registerButton = screen.getByRole('button', { name: /register/i });

        await user.type(nameInput, 'Test User');
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(registerButton);

        await waitFor(() => {
            expect(mockSignup).toHaveBeenCalledTimes(1);
            expect(mockSignup).toHaveBeenCalledWith({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            });
        });

        await waitFor(() => {
             expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ 
                title: 'Signup successful!'
             }));
        });
       
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/communities');
        });
    });

    it('shows error toast on signup failure', async () => {
        const errorMsg = 'Email already exists';
        mockSignup.mockRejectedValueOnce(new Error(errorMsg)); // Simulate signup failure
        const { user } = renderRegisterPage();

        const nameInput = screen.getByLabelText(/name/i);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const registerButton = screen.getByRole('button', { name: /register/i });

        await user.type(nameInput, 'Test User');
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(registerButton);

        await waitFor(() => {
            expect(mockSignup).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ 
                variant: 'destructive',
                title: 'Signup Failed',
                description: errorMsg,
             }));
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });
}); 