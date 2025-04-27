import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MemberList } from './MemberList';
import { AddMemberForm } from './AddMemberForm';
import { useMembers, useRemoveMember } from '@/features/membership/api'; // Use hooks from membership
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
// import { useToast } from "@/ui/use-toast"; // Optional

interface ManageMembersModalProps {
  communityId: number;
  trigger: React.ReactNode;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ communityId, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  // const { toast } = useToast(); // Optional

  const { data: members, isLoading: isLoadingMembers, error: membersError, refetch: refetchMembers } = useMembers(
    communityId,
    {
      enabled: isOpen, // Only fetch when the modal is open
    }
  );

  const removeMemberMutation = useRemoveMember();

  const handleRemoveMember = async (userId: number) => {
    removeMemberMutation.mutate(
      { communityId, userId },
      {
        onSuccess: () => {
          // Invalidation is handled by the hook's onSuccess, but we can add UI feedback
          // toast({ title: "Member removed successfully!" }); // Optional
          queryClient.invalidateQueries({ queryKey: ['members', communityId] }); // Ensure refetch
        },
        onError: (error) => {
          console.error("Failed to remove member:", error);
          // toast({ variant: "destructive", title: "Failed to remove member", description: error.message }); // Optional
        },
      }
    );
  };

  const handleModalOpenChange = (open: boolean) => {
     setIsOpen(open);
     if (open) {
       // Refetch members when modal opens, in case it was updated elsewhere
       refetchMembers();
     }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-white text-zinc-950 dark:bg-white dark:text-zinc-950">
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-zinc-500">
            Add or remove members from this community.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoadingMembers && (
            <div className="flex items-center justify-center p-8" data-testid="loading-indicator">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {membersError && (
             <div 
                className="flex items-center space-x-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive"
                data-testid="error-alert"
            >
                 <AlertCircle className="h-5 w-5" />
                <p className="text-sm">Error loading members: {membersError.message}</p>
             </div>
          )}
          {members && members.length > 0 && (
            <MemberList
              members={members}
              onRemove={handleRemoveMember}
              isLoadingRemove={removeMemberMutation.isPending}
              communityId={communityId}
            />
          )}
           {members && members.length === 0 && !isLoadingMembers && !membersError && (
             <p className="text-center text-muted-foreground">No members found.</p>
          )}

          {/* Render AddMemberForm only if members loaded successfully (to pass communityId reliably) */}
          {members && !membersError && (
             <AddMemberForm communityId={communityId} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 