import React from "react";
import { Hash, Lock, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { Channel } from "./ChatLayout";

interface ChannelHeaderProps {
  channel: Channel;
  onLeaveChannel?: () => void;
}

const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  onLeaveChannel,
}) => {
  const { user } = useAuth();
  console.log("ChannelHeader received channel:", channel);

  const isCreator =
    channel.created_by?._id === user?.id || channel.created_by === user?.id;

  const handleLeaveChannel = async () => {
    if (!onLeaveChannel) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/channels/${channel._id}/leave`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        onLeaveChannel();
      } else {
        const errorData = await response.json();
        alert(
          "Failed to leave channel: " + (errorData.message || "Unknown error")
        );
      }
    } catch (error) {
      alert("Error leaving channel: " + error);
    }
  };

  return (
    <div className="p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {channel.is_private ? (
            <Lock className="w-5 h-5 text-yellow-500" />
          ) : (
            <Hash className="w-5 h-5 text-gray-400" />
          )}

          <div>
            <h2 className="text-xl font-bold text-white">{channel.name}</h2>
            {channel.description && (
              <p className="text-sm text-gray-400">{channel.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {Array.isArray(channel.members) ? channel.members.length : 0}
            </span>
          </div>

          {!isCreator && onLeaveChannel && (
            <button
              onClick={handleLeaveChannel}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200"
              title="Leave Channel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
