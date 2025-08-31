import React from 'react';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import type { Message } from './ChatArea';

interface MessageListProps {
  messages: Message[];
  typingUsers: any[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  typingUsers,
  messagesEndRef
}) => {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 w-full">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p>Be the first to send a message in this channel!</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showAvatar = !prevMessage || 
              prevMessage.user_id._id !== message.user_id._id ||
              new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes

            return (
              <MessageItem
                key={message._id}
                message={message}
                showAvatar={showAvatar}
              />
            );
          })}
          
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
          
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default MessageList;