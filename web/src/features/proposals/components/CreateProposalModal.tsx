import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProposal } from '../api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateProposalModalProps {
  communityId: number;
  children: React.ReactNode;
}

const proposalSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  location: z.string().optional(),
  dateTime: z.string().optional(),
  tags: z.string().optional(),
  deadline: z.string().optional(),
  quorumPct: z.coerce.number().min(0).max(100),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({ communityId, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createProposalMutation = useCreateProposal(communityId);

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors }
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
        title: '',
        description: '',
        location: '',
        tags: '',
        quorumPct: 100,
        dateTime: '',
        deadline: '',
    }
  });

  const onSubmit: SubmitHandler<ProposalFormData> = async (data) => {
    const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    try {
      const payload = {
        communityId,
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        dateTime: data.dateTime ? new Date(data.dateTime).toISOString() : undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        quorumPct: data.quorumPct ?? 100,
      };

      await createProposalMutation.mutateAsync(payload);
      toast({ title: "Proposal Created", description: "Your proposal has been submitted." });
      reset();
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create proposal.",
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          reset();
          createProposalMutation.reset();
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-white text-zinc-950 dark:bg-white dark:text-zinc-950">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-zinc-500">
            Fill in the details for your new proposal. Click submit when done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Title */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title*</Label>
              <Input id="title" {...register('title')} className="col-span-3" />
            </div>
            {errors.title && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <Textarea id="description" {...register('description')} className="col-span-3" />
            </div>
            {errors.description && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>

          {/* Location */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input id="location" {...register('location')} className="col-span-3" />
            </div>
             {errors.location && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.location.message}</p>}
          </div>

          {/* Date & Time */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dateTime" className="text-right">Date & Time</Label>
              <Input
                  id="dateTime"
                  type="datetime-local"
                  {...register('dateTime')}
                  className="col-span-3"
              />
            </div>
            {errors.dateTime && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.dateTime.message}</p>}
          </div>

          {/* Tags */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tags" className="text-right">Tags</Label>
              <Input id="tags" {...register('tags')} placeholder="Comma-separated, e.g., fun, outdoors" className="col-span-3" />
            </div>
             {errors.tags && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.tags.message}</p>}
          </div>

          {/* Deadline */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deadline" className="text-right">Deadline</Label>
              <Input
                  id="deadline"
                  type="datetime-local"
                  {...register('deadline')}
                  className="col-span-3"
              />
            </div>
            {errors.deadline && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.deadline.message}</p>}
          </div>

          {/* Quorum */}
          <div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quorumPct" className="text-right">Quorum (%)</Label>
              <Input
                  id="quorumPct"
                  type="number"
                  min="0"
                  max="100"
                  {...register('quorumPct')}
                  className="col-span-3"
               />
            </div>
             {errors.quorumPct && <p className="col-start-2 col-span-3 text-red-500 text-sm mt-1">{errors.quorumPct.message}</p>}
          </div>

          {/* General API Error */}
          {createProposalMutation.isError && (
              <p role="alert" className="text-red-500 text-sm">
                  {createProposalMutation.error instanceof Error
                      ? createProposalMutation.error.message
                      : 'Failed to create proposal.'}
               </p>
          )}

          {/* Footer */}
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={createProposalMutation.isPending}>
              {createProposalMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                  'Submit Proposal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProposalModal; 