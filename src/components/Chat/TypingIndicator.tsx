import React from "react";

interface TypingIndicatorProps {
  users: Array<{ userId: string; username: string }>;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].username} and ${users[1].username} are typing...`;
    } else {
      return `${users[0].username} and ${
        users.length - 1
      } others are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-3 opacity-60">
      <div className="w-10 h-10 flex items-center justify-center">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
      <div className="text-sm text-gray-400 italic">{getTypingText()}</div>
    </div>
  );
};

export default TypingIndicator;
