import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Community } from '../types';
import { useUpdateCommunity, useDeleteCommunity } from '../api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CommunitySettingsModalProps {
  community: Community;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type CommunitySettingsFormValues = z.infer<typeof formSchema>;

export function CommunitySettingsModal({ community, isOpen, onOpenChange }: CommunitySettingsModalProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const updateCommunity = useUpdateCommunity();
  const deleteCommunity = useDeleteCommunity();

  const form = useForm<CommunitySettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: community.name,
      description: community.description || '',
      imageUrl: community.imageUrl || '',
    },
  });

  const handleSave = async (values: CommunitySettingsFormValues) => {
    try {
      await updateCommunity.mutateAsync({
        id: community.id,
        ...values,
      });
      onOpenChange(false); // Close modal on success
      form.reset(values); // Reset form with new values
    } catch (error) {
      // Error toast is handled by the hook
      console.error('Update failed', error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
       await deleteCommunity.mutateAsync(community.id);
       onOpenChange(false);
       navigate('/communities'); // Navigate after successful deletion
    } catch (error) {
       // Error toast is handled by the hook
       console.error('Delete failed', error);
    } finally {
       setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Community Settings</DialogTitle>
          <DialogDescription>
            Make changes to your community here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Community Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Community Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-between pt-4">
               <Button
                 type="button"
                 variant="destructive"
                 onClick={handleDelete}
                 disabled={deleteCommunity.isPending || isDeleting}
               >
                 {deleteCommunity.isPending || isDeleting ? 'Deleting...' : 'Delete Community'}
               </Button>
              <div className="flex gap-2">
                 <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                 </DialogClose>
                 <Button type="submit" disabled={updateCommunity.isPending || !form.formState.isDirty}>
                   {updateCommunity.isPending ? 'Saving...' : 'Save Changes'}
                 </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 