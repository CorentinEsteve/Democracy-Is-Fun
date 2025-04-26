import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CommunityList from './CommunityList';
import { Community } from '../types';

const mockCommunities: Community[] = [
  { id: 1, name: 'Community Alpha', creatorId: 1, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 2, name: 'Community Beta', description: 'Beta description', creatorId: 2, createdAt: '2023-01-02T00:00:00Z', updatedAt: '2023-01-02T00:00:00Z' },
];

const mockOnSelect = vi.fn();

describe('CommunityList', () => {
  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('renders a list of CommunityCards', () => {
    render(
      <CommunityList
        communities={mockCommunities}
        selectedCommunityId={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('Community Alpha')).toBeInTheDocument();
    expect(screen.getByText('Community Beta')).toBeInTheDocument();
    expect(screen.getByText('Beta description')).toBeInTheDocument();
  });

  it('renders empty state message when no communities are provided', () => {
    render(
      <CommunityList
        communities={[]}
        selectedCommunityId={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('No communities found.')).toBeInTheDocument();
  });

   it('renders empty state message when communities is null', () => {
     const { rerender } = render(
      <CommunityList
        communities={null as any} // Test null case
        selectedCommunityId={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('No communities found.')).toBeInTheDocument();

     rerender(
      <CommunityList
        communities={undefined as any} // Test undefined case
        selectedCommunityId={null}
        onSelect={mockOnSelect}
      />
    );
     expect(screen.getByText('No communities found.')).toBeInTheDocument();
   });


  it('calls onSelect with the correct id when a card is clicked', () => {
    render(
      <CommunityList
        communities={mockCommunities}
        selectedCommunityId={null}
        onSelect={mockOnSelect}
      />
    );
    fireEvent.click(screen.getByText('Community Beta'));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });

  it('passes isSelected correctly to CommunityCard', () => {
    render(
      <CommunityList
        communities={mockCommunities}
        selectedCommunityId={1} // Select the first community
        onSelect={mockOnSelect}
      />
    );
    // Check if the first card (Community Alpha) has the selected style
    const alphaCard = screen.getByText('Community Alpha').closest('.ring-2');
    expect(alphaCard).toBeInTheDocument();

     // Check if the second card (Community Beta) does not have the selected style
    const betaCard = screen.getByText('Community Beta').closest('div'); // Find the card container
    expect(betaCard).not.toHaveClass('ring-2');
  });
}); 