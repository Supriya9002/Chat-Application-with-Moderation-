import React, { useState, useEffect, useRef } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChannelHeader from "./ChannelHeader";
import { useSocket } from "../../contexts/SocketContext";
import type { Channel } from "./ChatLayout";

export interface Message {
  _id: string;
  channel_id: string;
  user_id: {
    _id: string;
    username: string;
    avatar_color: string;
  };
  content: string;
  is_flagged: boolean;
  created_at: string;
  edited_at?: string;
}

interface ChatAreaProps {
  channel: Channel;
  onLeaveChannel?: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ channel, onLeaveChannel }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channel) {
      fetchMessages();
      if (socket) {
        socket.emit("join-channel", channel._id);
      }
    }
  }, [channel._id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.channel_id === channel._id) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      console.log("Received message-deleted event for messageId:", messageId);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg._id !== messageId);
        console.log(
          "Messages after deletion:",
          filtered.length,
          "Previous count:",
          prev.length
        );
        return filtered;
      });
    };

    const handleTypingUpdate = ({
      channelId,
      typingUsers: users,
    }: {
      channelId: string;
      typingUsers: any[];
    }) => {
      if (channelId === channel._id) {
        setTypingUsers(users);
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("typing-update", handleTypingUpdate);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("typing-update", handleTypingUpdate);
    };
  }, [socket, channel._id]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/messages/channels/${channel._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (content: string) => {
    if (socket) {
      socket.emit("send-message", {
        channelId: channel._id,
        content,
      });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket) {
      if (isTyping) {
        socket.emit("typing", { channelId: channel._id });
      } else {
        socket.emit("stop-typing", { channelId: channel._id });
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 w-full">
      <ChannelHeader channel={channel} onLeaveChannel={onLeaveChannel} />

      <div className="flex-1 overflow-hidden w-full min-w-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            typingUsers={typingUsers}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        channel={channel}
      />
    </div>
  );
};

export default ChatArea;
