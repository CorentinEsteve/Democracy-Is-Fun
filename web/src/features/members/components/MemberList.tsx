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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ShieldCheck, User, Loader2 } from 'lucide-react';
import { MembershipWithUser, MembershipRole } from '@/features/membership/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRemoveMember, useUpdateMember } from '@/features/membership/api';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface MemberListProps {
  members: MembershipWithUser[];
  communityId: number;
}

export const MemberList: React.FC<MemberListProps> = ({ members, communityId }) => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

  // Removal Mutation
  const removeMemberMutation = useRemoveMember();
  const handleRemove = (userIdToRemove: number) => {
    setUpdatingMemberId(userIdToRemove);
    removeMemberMutation.mutate({ communityId, userId: userIdToRemove }, {
      onSettled: () => setUpdatingMemberId(null),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', communityId] }),
    });
  };

  // Role Update Mutation
  const updateRoleMutation = useUpdateMember();
  const handleRoleChange = (userIdToUpdate: number, newRole: MembershipRole) => {
    setUpdatingMemberId(userIdToUpdate);
    updateRoleMutation.mutate({ communityId, userId: userIdToUpdate, role: newRole }, {
      onSettled: () => setUpdatingMemberId(null),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', communityId] }),
    });
  };

  // Use member.userId for comparisons
  const currentUserMembership = members.find(member => member.userId === authUser?.id);
  const isAdmin = currentUserMembership?.role === 'Admin';
  const isProcessing = removeMemberMutation.isPending || updateRoleMutation.isPending;

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
          {members.map((member) => {
            // Use member.userId for comparisons and state tracking
            const isCurrentUser = authUser?.id === member.userId;
            const isMemberBeingProcessed = updatingMemberId === member.userId;
            const canPerformActions = isAdmin && !isCurrentUser;

            // Ensure membershipId exists before using it as a key
            const rowKey = member.membershipId ?? `user-${member.userId}`;

            return (
              <TableRow key={rowKey}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    {/* Access nested user data for display */}
                    <AvatarImage src={member.user.avatarUrl ?? undefined} alt={member.user.name ?? 'User'} />
                    <AvatarFallback>{member.user.name?.charAt(0)?.toUpperCase() ?? '?'}</AvatarFallback>
                  </Avatar>
                </TableCell>
                {/* Access nested user data for display */}
                <TableCell className="font-medium">{member.user.name ?? 'Unknown User'}</TableCell>
                <TableCell>
                  {canPerformActions ? (
                    <Select
                      value={member.role}
                      onValueChange={(value: MembershipRole) => handleRoleChange(member.userId, value)}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MembershipRole.Admin}>Admin</SelectItem>
                        <SelectItem value={MembershipRole.Member}>Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="flex items-center gap-1">
                      {member.role === 'Admin' ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-muted-foreground"/>}
                      {member.role}
                    </span>
                  )}
                </TableCell>
                <TableCell>{member.points}</TableCell>
                <TableCell className="text-right w-[100px]">
                  {isMemberBeingProcessed ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground inline-block" />
                  ) : (
                    <>
                      {canPerformActions && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(member.userId)}
                              disabled={isProcessing}
                              aria-label={`Remove ${member.user.name}`}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove {member.user.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground">(You)</span>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}; 