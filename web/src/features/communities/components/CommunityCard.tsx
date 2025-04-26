import React from 'react';
import { Community } from '../types';
import { Card, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { cn } from "@/lib/utils";

interface CommunityCardProps {
  community: Community;
  isSelected: boolean;
  onClick: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, isSelected, onClick }) => {
  return (
    <Card
        className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            isSelected ? "ring-2 ring-primary ring-offset-2" : "border-border"
        )}
        onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-lg truncate">{community.name}</CardTitle>
        {community.description && (
          <CardDescription className="text-sm truncate">
            {community.description}
          </CardDescription>
        )}
      </CardHeader>
      {/* Add image or other details if needed */}
    </Card>
  );
};

export default CommunityCard; 