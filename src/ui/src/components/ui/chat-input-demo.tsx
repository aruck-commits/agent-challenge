"use client";

import { useState } from 'react';
import {
  ChatInput,
  ChatInputSubmit,
  ChatInputTextArea,
} from '@/components/ui/chat-input';

function ChatInputDemo() {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      window.alert(value || 'Empty message');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="h-full w-full max-w-[400px]">
      <ChatInput
        variant="default"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onSubmit={handleSubmit}
        loading={isLoading}
        onStop={() => setIsLoading(false)}
      >
        <ChatInputTextArea placeholder="Type a message..." />
        <ChatInputSubmit />
      </ChatInput>
    </div>
  );
}

export { ChatInputDemo };
