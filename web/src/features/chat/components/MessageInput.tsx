import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateMessage } from '../api';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  communityId: number;
}

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

type MessageFormData = z.infer<typeof messageSchema>;

const MessageInput: React.FC<MessageInputProps> = ({ communityId }) => {
  const { toast } = useToast();
  const createMessageMutation = useCreateMessage();
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
        content: ''
    }
  });

  const onSubmit = async (data: MessageFormData) => {
    try {
      await createMessageMutation.mutateAsync({
        communityId,
        content: data.content,
      });
      reset(); // Clear form on success
    } catch (error) {
      console.error("Submit Message Error:", error);
      toast({ 
        variant: "destructive",
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  const isPending = createMessageMutation.isPending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-start space-x-2 pt-4 border-t">
      <Textarea
        id="content"
        placeholder="Type your message here..."
        className="flex-1 resize-none min-h-[40px] max-h-[150px]"
        rows={1} // Start with 1 row, auto-expands with content
        {...register('content')}
        disabled={isPending}
        onKeyDown={(e) => {
          // Submit on Enter, new line on Shift+Enter
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }
        }}
      />
      <Button type="submit" size="icon" disabled={isPending} aria-label="Send message">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
       {/* Display validation errors below */}
       {errors.content && (
          <p className="text-xs text-destructive absolute bottom-0 left-2 translate-y-full">{errors.content.message}</p>
       )} 
    </form>
  );
};

export default MessageInput; 