import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle } from 'lucide-react';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
  dateTime: z.date().optional(),
  tags: z.string().optional(),
  deadline: z.date().optional(),
  quorumPct: z.coerce.number().min(0).max(100).optional().default(100),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({ communityId, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createProposalMutation = useCreateProposal(communityId);

  const { 
    register, 
    handleSubmit, 
    control, 
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
        title: '',
        description: '',
        location: '',
        tags: '',
        quorumPct: 100,
    }
  });

  const selectedDateTime = watch("dateTime");
  const selectedDeadline = watch("deadline");

  const onSubmit = async (data: ProposalFormData) => {
    const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    try {
      await createProposalMutation.mutateAsync({
        communityId,
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        dateTime: data.dateTime ? data.dateTime.toISOString() : undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        deadline: data.deadline ? data.deadline.toISOString() : undefined,
        quorumPct: data.quorumPct,
      });
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
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title*</Label>
            <Input id="title" {...register('title')} className="col-span-3" />
            {errors.title && <p className="col-span-4 text-red-500 text-sm">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Description</Label>
            <Textarea id="description" {...register('description')} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Location</Label>
            <Input id="location" {...register('location')} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dateTime" className="text-right">Date/Time</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !selectedDateTime && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDateTime ? format(selectedDateTime, "PPP HH:mm") : <span>Pick date & time</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDateTime}
                            onSelect={(date) => setValue('dateTime', date, { shouldValidate: true })}
                            initialFocus
                        />
                         <div className="p-2 border-t border-border">
                            <p className="text-xs text-muted-foreground">Time selection not implemented yet.</p>
                         </div>
                    </PopoverContent>
                </Popover>
            </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <Input id="tags" {...register('tags')} placeholder="Comma-separated, e.g., fun, outdoors" className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline" className="text-right">Deadline</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !selectedDeadline && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDeadline ? format(selectedDeadline, "PPP") : <span>Pick a deadline</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDeadline}
                            onSelect={(date) => setValue('deadline', date, { shouldValidate: true })}
                             disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
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
            {createProposalMutation.isError && (
                <p role="alert" className="col-span-4 text-red-500 text-sm">
                    {createProposalMutation.error instanceof Error 
                        ? createProposalMutation.error.message 
                        : 'Failed to create proposal.'}
                 </p>
            )}
        </form>
        <DialogFooter>
           <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
           </DialogClose>
          <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={createProposalMutation.isPending}>
            {createProposalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
            {createProposalMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProposalModal; 