import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import axios from 'axios';

// Define the User type based on your API response
interface User {
  id: number;
  name: string;
  email: string;
  // Add other relevant user fields
}

// Define the shape of the context data
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Add loading state
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Create a provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until checked

  // Load token and user from localStorage on initial mount
  useEffect(() => {
    try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    } catch (error) {
        console.error("Failed to load auth state from localStorage", error);
        // Clear potentially corrupted storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post<{ user: User; token: string }>(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { email, password }
      );
      const { user: loggedInUser, token: authToken } = response.data;

      localStorage.setItem('authToken', authToken);
      localStorage.setItem('authUser', JSON.stringify(loggedInUser));
      setToken(authToken);
      setUser(loggedInUser);
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any potentially leftover state
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setToken(null);
      setUser(null);
       throw error; // Re-throw error to be caught by the caller
    } finally {
        setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user; // Determine auth status based on token/user presence

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a custom hook for easy context usage
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 