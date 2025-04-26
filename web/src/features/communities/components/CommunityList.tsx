import React from 'react';
import { Community } from '../types';
import CommunityCard from './CommunityCard';

interface CommunityListProps {
  communities: Community[];
  // selectedCommunityId: number | null; // Removed - handled inside CommunityCard via useParams
  // onSelect: (id: number) => void; // Removed - navigation handled by Link in CommunityCard
}

const CommunityList: React.FC<CommunityListProps> = ({ communities }) => {
  if (!communities || communities.length === 0) {
    return <p className="text-center text-muted-foreground">No communities found.</p>;
  }

  return (
    <div className="space-y-3 overflow-y-auto h-[calc(100vh-200px)] p-1"> {/* Adjust height as needed */}
      {communities.map((community) => (
        <CommunityCard
          key={community.id}
          community={community}
          // isSelected prop removed
          // onClick prop removed
        />
      ))}
    </div>
  );
};

export default CommunityList; 