import React, { useState, useEffect } from 'react';
import { Hash, Lock, Plus, Search, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CreateChannelModal from './CreateChannelModal';
import JoinChannelModal from './JoinChannelModal';
import type { Channel } from './ChatLayout';

interface SidebarProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  onChannelCreated: (channel: Channel) => void;
  onChannelJoined: (channel: Channel) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  channels,
  activeChannel,
  onChannelSelect,
  onChannelCreated,
  onChannelJoined
}) => {
  const { user, logout } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'now';
      }
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return 'now';
      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return `${hours}h`;
      return `${days}d`;
    } catch (error) {
      console.error('Error formatting time:', error, dateString);
      return 'now';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Channels</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Join Channel"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredChannels.map((channel) => (
            <button
              key={channel._id}
              onClick={() => onChannelSelect(channel)}
              className={`w-full p-3 mb-1 rounded-lg text-left transition-colors duration-200 ${
                activeChannel?._id === channel._id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {channel.is_private ? (
                    <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{channel.name}</div>
                    {channel.description && (
                      <div className="text-xs opacity-75 truncate">{channel.description}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs opacity-60 flex-shrink-0 ml-2">
                  {formatTime(channel.last_activity)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: user?.avatar_color }}
            >
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-medium">{user?.username}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={onChannelCreated}
        />
      )}

      {showJoinModal && (
        <JoinChannelModal
          onClose={() => setShowJoinModal(false)}
          onChannelJoined={onChannelJoined}
        />
      )}
    </div>
  );
};

export default Sidebar;