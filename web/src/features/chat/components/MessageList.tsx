import React, { useEffect, useRef } from 'react';
import { useMessages } from '../api';
import { Loader2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageListProps {
  communityId: number;
}

const MessageList: React.FC<MessageListProps> = ({ communityId }) => {
  const { data: messages, isLoading, isError, error } = useMessages(communityId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages load or update
    if (viewportRef.current) {
        // Use setTimeout to ensure scroll happens after DOM update
        setTimeout(() => {
           if (viewportRef.current) { // Check again inside timeout
                viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
           }
        }, 0);
    }
  }, [messages]); // Dependency on messages ensures scroll on new message

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full" data-testid="loading-messages">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-destructive" data-testid="error-messages">
         <AlertTriangle className="h-8 w-8 mb-2" />
        <p>Error loading messages: {error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full flex-grow pr-4" ref={scrollAreaRef}>
        <div className="space-y-4 py-4" ref={viewportRef}>
            {messages && messages.length > 0 ? (
                messages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-3">
                     <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.author?.avatarUrl || undefined} alt={msg.author?.name || 'User'} />
                        <AvatarFallback>{msg.author?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-baseline space-x-2">
                            <span className="font-medium text-sm">{msg.author?.name || 'Unknown User'}</span>
                            <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-sm text-foreground leading-snug">{msg.content}</p>
                    </div>
                </div>
                ))
            ) : (
                <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
            )}
        </div>
    </ScrollArea>
  );
};

export default MessageList; 