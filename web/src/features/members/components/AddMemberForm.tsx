import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAddMember } from '@/features/membership/api'; // Use hooks from membership
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
// import { useToast } from "@/ui/use-toast"; // Optional

interface AddMemberFormProps {
  communityId: number;
}

export const AddMemberForm: React.FC<AddMemberFormProps> = ({ communityId }) => {
  const [userIdentifier, setUserIdentifier] = useState('');
  const queryClient = useQueryClient();
  // const { toast } = useToast(); // Optional
  const addMemberMutation = useAddMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdentifier.trim()) return;

    addMemberMutation.mutate(
      { communityId, userIdentifier: userIdentifier.trim() },
      {
        onSuccess: () => {
          // toast({ title: "Member added successfully!" }); // Optional
          setUserIdentifier(''); // Clear input on success
          queryClient.invalidateQueries({ queryKey: ['members', communityId] }); // Refetch list
        },
        onError: (error) => {
          console.error("Failed to add member:", error);
          // toast({ variant: "destructive", title: "Failed to add member", description: error.message }); // Optional
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-start space-x-2 border-t pt-4">
      <div className="flex-grow">
        <Input
          id="userIdentifier"
          placeholder="User ID or Email to add"
          value={userIdentifier}
          onChange={(e) => setUserIdentifier(e.target.value)}
          disabled={addMemberMutation.isPending}
          required
        />
        {addMemberMutation.error && (
          <div className="mt-1 flex items-center text-sm text-destructive">
            <AlertCircle className="mr-1 h-4 w-4" />
            {addMemberMutation.error.message || 'Failed to add member'}
          </div>
        )}
      </div>
      <Button type="submit" disabled={addMemberMutation.isPending || !userIdentifier.trim()} size="sm">
        {addMemberMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Member
      </Button>
    </form>
  );
}; 