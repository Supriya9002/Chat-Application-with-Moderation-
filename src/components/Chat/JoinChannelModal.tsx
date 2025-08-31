import React, { useState, useEffect } from "react";
import { X, Hash, Users } from "lucide-react";
import type { Channel } from "./ChatLayout";

interface JoinChannelModalProps {
  onClose: () => void;
  onChannelJoined: (channel: Channel) => void;
}

const JoinChannelModal: React.FC<JoinChannelModalProps> = ({
  onClose,
  onChannelJoined,
}) => {
  const [publicChannels, setPublicChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicChannels();
  }, []);

  const fetchPublicChannels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3001/api/channels/public",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPublicChannels(data.channels);
      }
    } catch (error) {
      console.error("Error fetching public channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelId: string) => {
    setJoining(channelId);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/channels/${channelId}/join`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (response.ok) {
        onChannelJoined(data.channel);
        onClose();
      } else {
        console.error("Error joining channel:", data.message);
      }
    } catch (error) {
      console.error("Error joining channel:", error);
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Join Channel</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-64">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              Loading channels...
            </div>
          ) : publicChannels.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No public channels available
            </div>
          ) : (
            publicChannels.map((channel) => (
              <div
                key={channel._id}
                className="p-3 bg-gray-700 rounded-lg border border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate">
                        {channel.name}
                      </div>
                      {channel.description && (
                        <div className="text-xs text-gray-400 truncate">
                          {channel.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <Users className="w-3 h-3" />
                        <span>{channel.members?.length || 0} members</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinChannel(channel._id)}
                    disabled={joining === channel._id}
                    className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-md transition-colors duration-200"
                  >
                    {joining === channel._id ? "Joining..." : "Join"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinChannelModal;
