import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import UserList from './UserList';
import { useSocket } from '../../contexts/SocketContext';

export interface Channel {
  _id: string;
  name: string;
  description: string;
  is_private: boolean;
  created_by: any;
  members: any[];
  last_activity: string;
  created_at: string;
}

const ChatLayout: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket, connected } = useSocket();

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched channels:', data.channels);
        setChannels(data.channels);
        if (data.channels.length > 0 && !activeChannel) {
          setActiveChannel(data.channels[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setActiveChannel(channel);
    if (socket) {
      socket.emit('join-channel', channel._id);
    }
  };

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels(prev => [newChannel, ...prev]);
    setActiveChannel(newChannel);
  };

  const handleChannelJoined = (channel: Channel) => {
    setChannels(prev => {
      const exists = prev.find(c => c._id === channel._id);
      return exists ? prev : [channel, ...prev];
    });
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading channels...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <Sidebar
          channels={channels}
          activeChannel={activeChannel}
          onChannelSelect={handleChannelSelect}
          onChannelCreated={handleChannelCreated}
          onChannelJoined={handleChannelJoined}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeChannel ? (
            <ChatArea channel={activeChannel} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <h2 className="text-2xl font-semibold mb-2">Welcome to ChatApp</h2>
                <p>Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {/* User List */}
        {activeChannel && (
          <div className="w-64 bg-gray-800 border-l border-gray-700">
            <UserList channel={activeChannel} />
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!connected && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Disconnected - Attempting to reconnect...
        </div>
      )}
    </div>
  );
};

export default ChatLayout;