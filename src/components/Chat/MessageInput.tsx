import React, { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import type { Channel } from "./ChatLayout";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  channel?: Channel;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  channel,
}) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && message.length <= 1000) {
      onSendMessage(message.trim());
      setMessage("");
      handleStopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      onTyping(true);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 border-t border-gray-700 bg-gray-800">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message #${
              channel?.name || "channel"
            } (max 1000 characters)`}
            maxLength={1000}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[48px] max-h-32 overflow-y-auto"
            rows={1}
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              const maxHeight = 128; // 8rem = 128px
              target.style.height = "auto";
              const newHeight = Math.min(target.scrollHeight, maxHeight);
              target.style.height = `${newHeight}px`;

              // If content exceeds max height, show scrollbar
              if (target.scrollHeight > maxHeight) {
                target.style.overflowY = "auto";
              } else {
                target.style.overflowY = "hidden";
              }
            }}
          />
          {message.length > 800 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/1000
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="submit"
            disabled={!message.trim() || message.length > 1000}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
            title={
              message.length > 1000
                ? "Message too long (max 1000 characters)"
                : "Send message"
            }
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
