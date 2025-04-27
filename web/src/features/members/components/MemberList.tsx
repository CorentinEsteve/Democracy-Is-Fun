import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, ShieldCheck, User } from 'lucide-react';
import { Member } from '@/features/membership/types';
import { useAuth } from '@/contexts/AuthContext';

interface MemberListProps {
  members: Member[];
  onRemove: (userId: number) => void;
  isLoadingRemove: boolean;
  communityId: number; // Needed to check current user's role in *this* community
}

export const MemberList: React.FC<MemberListProps> = ({ members, onRemove, isLoadingRemove, communityId }) => {
  const { user } = useAuth();

  // Find the current user's role *within this specific community's membership list*
  const currentUserMembership = members.find(member => member.id === user?.id);
  const isAdmin = currentUserMembership?.role === 'Admin';

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Points</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => (
            <TableRow key={member.membershipId ?? `member-${index}`}>
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatarUrl} alt={member.name ?? 'User'} />
                  <AvatarFallback>{member.name?.charAt(0)?.toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{member.name ?? 'Unknown User'}</TableCell>
              <TableCell>
                 <span className="flex items-center gap-1">
                    {member.role === 'Admin' ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-muted-foreground"/>}
                    {member.role}
                 </span>
                </TableCell>
              <TableCell>{member.points}</TableCell>
              <TableCell className="text-right">
                {isAdmin && user?.id !== member.id && ( // Admins can remove others, but not themselves
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(member.id)}
                        disabled={isLoadingRemove}
                        aria-label={`Remove ${member.name}`}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove {member.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                 {user?.id === member.id && (
                    <span className="text-xs text-muted-foreground">(You)</span>
                 )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}; 