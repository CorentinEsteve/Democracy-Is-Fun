import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/card';

const ChatPanel: React.FC = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Chat interface will be here.</p>
        {/* Placeholder for chat messages and input */}
      </CardContent>
    </Card>
  );
};

export default ChatPanel; 