import { render, screen } from '@testing-library/react';
// import { vi } from 'vitest'; // No longer needed unless mocking children
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import CommunityList from './CommunityList';
import { Community } from '../types';

// Mock CommunityCard to prevent issues with its internal Link/useParams
// We only want to test that CommunityList renders the correct number of cards
vi.mock('@/features/communities/components/CommunityCard', () => ({
    default: ({ community }: { community: Community }) => (
        <div data-testid={`community-card-${community.id}`}>{community.name}</div>
    ),
}));

const mockCommunities: Community[] = [
  { id: 1, name: 'Community Alpha', creatorId: 1, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 2, name: 'Community Beta', description: 'Beta description', creatorId: 2, createdAt: '2023-01-02T00:00:00Z', updatedAt: '2023-01-02T00:00:00Z' },
];

// const mockOnSelect = vi.fn(); // Removed

// Helper function for rendering with router
const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('CommunityList', () => {
//   beforeEach(() => {
//     mockOnSelect.mockClear(); // Removed
//   });

  it('renders a list of CommunityCards', () => {
    renderWithRouter(
      <CommunityList communities={mockCommunities} />
    );
    // Check that the mocked cards are rendered
    expect(screen.getByTestId('community-card-1')).toBeInTheDocument();
    expect(screen.getByText('Community Alpha')).toBeInTheDocument();
    expect(screen.getByTestId('community-card-2')).toBeInTheDocument();
    expect(screen.getByText('Community Beta')).toBeInTheDocument();
  });

  it('renders empty state message when no communities are provided', () => {
    renderWithRouter(
      <CommunityList communities={[]} />
    );
    expect(screen.getByText('No communities found.')).toBeInTheDocument();
  });

   it('renders empty state message when communities is null or undefined', () => {
     const { rerender } = renderWithRouter(
      <CommunityList communities={null as any} /> // Test null case
    );
    expect(screen.getByText('No communities found.')).toBeInTheDocument();

     rerender(
      <BrowserRouter>
        <CommunityList communities={undefined as any} /> {/* Test undefined case */}
      </BrowserRouter>
    );
     expect(screen.getByText('No communities found.')).toBeInTheDocument();
   });

  // Removed test: 'calls onSelect with the correct id when a card is clicked'

  // Removed test: 'passes isSelected correctly to CommunityCard'

}); 