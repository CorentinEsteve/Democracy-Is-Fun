import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CommunityCard from './CommunityCard';
import { Community } from '../types';

const mockCommunity: Community = {
  id: 1,
  name: 'Test Community',
  description: 'This is a test description',
  creatorId: 1,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockOnClick = vi.fn();

describe('CommunityCard', () => {
  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders community name and description', () => {
    render(
      <CommunityCard
        community={mockCommunity}
        isSelected={false}
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText(mockCommunity.name)).toBeInTheDocument();
    expect(screen.getByText(mockCommunity.description!)).toBeInTheDocument();
  });

  it('does not render description if null', () => {
    const communityWithoutDesc = { ...mockCommunity, description: null };
    render(
      <CommunityCard
        community={communityWithoutDesc}
        isSelected={false}
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText(mockCommunity.name)).toBeInTheDocument();
    expect(screen.queryByText(mockCommunity.description!)).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(
      <CommunityCard
        community={mockCommunity}
        isSelected={false}
        onClick={mockOnClick}
      />
    );
    fireEvent.click(screen.getByText(mockCommunity.name));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(
      <CommunityCard
        community={mockCommunity}
        isSelected={true}
        onClick={mockOnClick}
      />
    );
    // Check for a class that indicates selection (e.g., ring)
    // Note: Exact class depends on implementation using cn()
    expect(container.firstChild).toHaveClass('ring-2'); // Example check
  });

  it('does not apply selected styles when isSelected is false', () => {
      const { container } = render(
        <CommunityCard
          community={mockCommunity}
          isSelected={false}
          onClick={mockOnClick}
        />
      );
      expect(container.firstChild).not.toHaveClass('ring-2'); // Example check
    });
}); 