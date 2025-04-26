import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { useCreateCommunity } from '../api';
import { CreateCommunityPayload } from '../types';
import { Loader2 } from 'lucide-react';

interface CreateCommunityModalProps {
  children: React.ReactNode; // The trigger button
}

const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: createCommunity, isPending } = useCreateCommunity();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload: CreateCommunityPayload = { name };
    if (description) payload.description = description;
    if (imageUrl) payload.imageUrl = imageUrl;

    try {
      await createCommunity(payload);
      // Reset form and close modal on success
      setName('');
      setDescription('');
      setImageUrl('');
      setIsOpen(false);
    } catch (err: any) {
      console.error("Failed to create community:", err);
      setError(err.message || 'Failed to create community. Please try again.');
    }
  };

  const handleOpenChange = (open: boolean) => {
     if (!isPending) { // Prevent closing while submitting
        setIsOpen(open);
        if (!open) {
             // Reset form state if modal is closed without submitting
            setName('');
            setDescription('');
            setImageUrl('');
            setError(null);
        }
     }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Community</DialogTitle>
          <DialogDescription>
            Fill in the details for your new community. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
             {error && (
                <p className="text-sm text-center text-red-600" role="alert">{error}</p>
             )}
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="name" className="text-right">
                Name*
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
                disabled={isPending}
              />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                disabled={isPending}
              />
            </div>
             <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="imageUrl" className="text-right">
                Image URL
              </Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="col-span-3"
                type="url"
                 placeholder="https://example.com/image.png"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
             {/* Using DialogClose might interfere with pending state, manual close preferred */}
             {/* <DialogClose asChild> */}
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                    Cancel
                </Button>
             {/* </DialogClose> */}
            <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isPending ? 'Saving...' : 'Save Community'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommunityModal; 