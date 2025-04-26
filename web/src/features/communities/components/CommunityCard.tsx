import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Community } from '../types';
import { Card, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { cn } from "@/lib/utils";

interface CommunityCardProps {
  community: Community;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community }) => {
  const { communityId } = useParams<{ communityId?: string }>();
  const isSelected = communityId === String(community.id);

  return (
    <Link to={`/communities/${community.id}`} className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-lg">
        <Card
            className={cn(
                "transition-all hover:shadow-md border-border",
                isSelected ? "ring-2 ring-primary ring-offset-background ring-offset-2" : ""
            )}
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
    </Link>
  );
};

export default CommunityCard; 