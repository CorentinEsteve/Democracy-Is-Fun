import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom'; // Needed for useNavigate
import { vi } from 'vitest';
import CommunitiesPage from '../CommunitiesPage';
import { Community } from '@/features/communities/types';
import React from 'react';
// Import the actual provider and the hook separately
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock API hooks
const mockCommunities: Community[] = [
  { id: 1, name: 'Alpha Community', description: 'First one', creatorId: 1, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 2, name: 'Beta Community', description: 'Second one', creatorId: 2, createdAt: '2023-01-02T00:00:00Z', updatedAt: '2023-01-02T00:00:00Z' },
  { id: 3, name: 'Gamma Searchable', description: 'Third', creatorId: 1, createdAt: '2023-01-03T00:00:00Z', updatedAt: '2023-01-03T00:00:00Z' },
];

const mockUseCommunities = vi.fn();
vi.mock('@/features/communities/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/communities/api')>();
    return {
        ...actual,
        useCommunities: () => mockUseCommunities(),
        // useCreateCommunity will be mocked by its own test file or default mock needed here if used directly
    };
});

// Mock CreateCommunityModal - simplest mock, doesn't need internal logic for this test
vi.mock('@/features/communities/components/CreateCommunityModal', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="create-modal-trigger">{children}</div>,
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext hook return value
const mockLogout = vi.fn();
const mockUser = { id: 1, name: 'Tester', email: 'test@test.com' };
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/contexts/AuthContext')>();
    return {
        ...actual, // Keep the actual AuthProvider
        useAuth: vi.fn(() => ({ // Mock only the hook
            user: mockUser,
            token: 'fake-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
        })),
    };
});


// React Query wrapper
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
});

// Updated render helper: Use the actual AuthProvider
const renderPage = () => {
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider> {/* Use the real provider */} 
                <Router>
                    <CommunitiesPage />
                </Router>
            </AuthProvider>
        </QueryClientProvider>
    );
};

describe('CommunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    // Default successful fetch
    mockUseCommunities.mockReturnValue({
      data: mockCommunities,
      isLoading: false,
      error: null,
      isSuccess: true,
    });
  });

  it('renders loading state initially', () => {
    mockUseCommunities.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isSuccess: false,
    });
    renderPage();
    // Use query selector for spinner or a more specific role if available
    expect(screen.getByRole('status', { name: /loading communities/i })).toBeInTheDocument(); 
    expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
     const errorMsg = 'Failed to load';
     mockUseCommunities.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error(errorMsg),
        isSuccess: false,
        isError: true,
     });
     renderPage();
     expect(screen.getByRole('alert')).toHaveTextContent(`Error loading communities: ${errorMsg}`);
     expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
   });

  it('renders the list of communities on successful fetch', () => {
    renderPage();
    expect(screen.getByText('Alpha Community')).toBeInTheDocument();
    expect(screen.getByText('Beta Community')).toBeInTheDocument();
    expect(screen.getByText('Gamma Searchable')).toBeInTheDocument();
    // Check that loading/error indicators are not present
    expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument(); 
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

   it('renders user name and logout button', () => {
    renderPage();
    expect(screen.getByText(`Hi, ${mockUser.name}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

   it('calls logout when logout button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('filters communities based on search term', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText(/search communities/i);

    fireEvent.change(searchInput, { target: { value: 'beta' } });
    expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Community')).toBeInTheDocument();
    expect(screen.queryByText('Gamma Searchable')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'search' } });
    expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
    expect(screen.getByText('Gamma Searchable')).toBeInTheDocument();

     fireEvent.change(searchInput, { target: { value: 'one' } }); // Search description
     expect(screen.getByText('Alpha Community')).toBeInTheDocument();
     expect(screen.getByText('Beta Community')).toBeInTheDocument();
     expect(screen.queryByText('Gamma Searchable')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } }); // Clear search
    expect(screen.getByText('Alpha Community')).toBeInTheDocument();
    expect(screen.getByText('Beta Community')).toBeInTheDocument();
    expect(screen.getByText('Gamma Searchable')).toBeInTheDocument();
  });

  it('navigates when a community card is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Beta Community'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/communities/2');
  });

  it('renders create community modal trigger', () => {
    renderPage();
    expect(screen.getByTestId('create-modal-trigger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create new community/i })).toBeInTheDocument();
  });

}); 