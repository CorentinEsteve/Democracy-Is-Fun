import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CommunityCard from './CommunityCard';
import { Community } from '../types';

// Mock useParams
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useParams: () => mockUseParams(), // Return the mock function's result
    };
});

const mockCommunity: Community = {
  id: 1,
  name: 'Test Community',
  description: 'This is a test description',
  creatorId: 1,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

// Helper function for rendering with router
const renderWithRouter = (ui: React.ReactElement, communityIdParam?: string) => {
    mockUseParams.mockReturnValue({ communityId: communityIdParam }); // Set mock return value
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('CommunityCard', () => {
  beforeEach(() => {
    mockUseParams.mockClear();
  });

  it('renders community name and description', () => {
    renderWithRouter(
      <CommunityCard community={mockCommunity} />
    );
    expect(screen.getByText(mockCommunity.name)).toBeInTheDocument();
    expect(screen.getByText(mockCommunity.description!)).toBeInTheDocument();
    // Check that it renders a link
    expect(screen.getByRole('link')).toHaveAttribute('href', '/communities/1');
  });

  it('does not render description if null', () => {
    const communityWithoutDesc = { ...mockCommunity, description: null };
    renderWithRouter(
      <CommunityCard community={communityWithoutDesc} />
    );
    expect(screen.getByText(mockCommunity.name)).toBeInTheDocument();
    expect(screen.queryByText(mockCommunity.description!)).not.toBeInTheDocument();
  });

  it('applies selected styles when URL parameter matches community ID', () => {
    const { container } = renderWithRouter(
      <CommunityCard community={mockCommunity} />,
      '1' // Mock useParams to return communityId = '1'
    );
    // Check for the specific class applied when selected
    const cardElement = container.querySelector('.ring-2.ring-primary');
    expect(cardElement).toBeInTheDocument();
  });

  it('does not apply selected styles when URL parameter does not match', () => {
    const { container } = renderWithRouter(
      <CommunityCard community={mockCommunity} />,
      '2' // Mock useParams to return different communityId
    );
    const cardElement = container.querySelector('.ring-2.ring-primary');
    expect(cardElement).not.toBeInTheDocument();
  });

   it('does not apply selected styles when URL parameter is absent', () => {
      const { container } = renderWithRouter(
        <CommunityCard community={mockCommunity} />
        // No communityId param passed to render helper
      );
      const cardElement = container.querySelector('.ring-2.ring-primary');
      expect(cardElement).not.toBeInTheDocument();
    });
}); 