import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import axios from 'axios';
import { vi } from 'vitest';
import React from 'react';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    mockedAxios.post.mockClear();
    localStorageMock.clear();
    // Reset AuthProvider internal state by re-rendering (if necessary, though wrapper does this)
  });

  it('should initialize with no user and token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login successfully, update state and localStorage', async () => {
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const mockToken = 'fake-jwt-token';
    mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/auth/login`,
      { email: 'test@example.com', password: 'password' }
    );
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorageMock.getItem('authToken')).toBe(mockToken);
    expect(JSON.parse(localStorageMock.getItem('authUser') || '{}')).toEqual(mockUser);
  });

  it('should signup successfully, update state and localStorage', async () => {
    const mockUser = { id: 2, name: 'New User', email: 'new@example.com' };
    const mockToken = 'new-fake-jwt-token';
    const signupCredentials = { name: 'New User', email: 'new@example.com', password: 'newpassword' };
    
    mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signup(signupCredentials);
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/auth/signup`,
      signupCredentials
    );
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorageMock.getItem('authToken')).toBe(mockToken);
    expect(JSON.parse(localStorageMock.getItem('authUser') || '{}')).toEqual(mockUser);
  });

  it('should handle signup failure', async () => {
    const signupError = new Error('Signup failed');
    const signupCredentials = { name: 'Fail User', email: 'fail@example.com', password: 'failpassword' };
    mockedAxios.post.mockRejectedValueOnce(signupError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await expect(result.current.signup(signupCredentials))
        .rejects.toThrow(signupError.message);
    });

    // Verify state after the failed attempt
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.getItem('authToken')).toBeNull();
    expect(localStorageMock.getItem('authUser')).toBeNull();
  });

  it('should handle login failure', async () => {
    const loginError = new Error('Login failed');
    mockedAxios.post.mockRejectedValueOnce(loginError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      // Expect the login function itself to reject (or throw)
      await expect(result.current.login('wrong@example.com', 'wrong'))
        .rejects.toThrow(loginError.message);
    });

    // Verify state after the failed attempt
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.getItem('authToken')).toBeNull();
    expect(localStorageMock.getItem('authUser')).toBeNull();
  });

  it('should logout successfully, update state and clear localStorage', async () => {
    // Setup initial logged-in state
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const mockToken = 'fake-jwt-token';
    localStorageMock.setItem('authToken', mockToken);
    localStorageMock.setItem('authUser', JSON.stringify(mockUser));

    // Render hook with initial state potentially read from localStorage
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Need to ensure the initial state reflects localStorage before logout
    // This might require adjustment in AuthProvider to read from localStorage on init
    // For this test, let's assume login happened first or state is manually set if needed.
    // If AuthProvider reads from localStorage on mount, the initial check might pass automatically.
    // Let's simulate login first to set the state correctly within the test run
     mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken },
    });
     await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true); // Verify initial state

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.getItem('authToken')).toBeNull();
    expect(localStorageMock.getItem('authUser')).toBeNull();
  });

   it('should load initial state from localStorage', () => {
    const mockUser = { id: 2, name: 'Persisted User', email: 'persist@example.com' };
    const mockToken = 'persisted-token';
    localStorageMock.setItem('authToken', mockToken);
    localStorageMock.setItem('authUser', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });
}); 