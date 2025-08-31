import React, { useState, useEffect } from "react";
import { Crown, Shield, User, Circle } from "lucide-react";
import type { Channel } from "./ChatLayout";

interface Member {
  user: {
    _id: string;
    username: string;
    avatar_color: string;
    is_online: boolean;
  };
  role: string;
  joined_at: string;
}

interface UserListProps {
  channel: Channel;
}

const UserList: React.FC<UserListProps> = ({ channel }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("UserList received channel:", {
    id: channel._id,
    name: channel.name,
    memberCount: channel.members?.length || 0,
    members: channel.members,
  });

  useEffect(() => {
    fetchMembers();
  }, [channel._id]);

  // Fallback: if members array is empty but channel has members, use channel members
  useEffect(() => {
    if (members.length === 0 && channel.members && channel.members.length > 0) {
      console.log("Using fallback channel members:", channel.members);
      setMembers(channel.members);
    }
  }, [members.length, channel.members]);

  const fetchMembers = async () => {
    try {
      console.log("Fetching members for channel:", channel._id);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/channels/${channel._id}/members`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Members response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Members data received:", data);
        console.log("Members array:", data.members);
        console.log("Members count:", data.members?.length || 0);
        setMembers(data.members || []);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch members:", errorData);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "moderator":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    // Sort by: online status, then role, then username
    if (a.user.is_online !== b.user.is_online) {
      return a.user.is_online ? -1 : 1;
    }

    const roleOrder = { admin: 0, moderator: 1, member: 2 };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }

    return a.user.username.localeCompare(b.user.username);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Members ({members.length})
          </h3>
          <button
            onClick={fetchMembers}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-xs"
            title="Refresh members"
          >
            🔄
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Channel members: {channel.members?.length || 0}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            Loading members...
          </div>
        ) : (
          <div className="p-2">
            {sortedMembers.map((member) => (
              <div
                key={member.user._id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                    style={{ backgroundColor: member.user.avatar_color }}
                  >
                    {member.user.username.charAt(0).toUpperCase()}
                  </div>
                  {member.user.is_online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium truncate">
                      {member.user.username}
                    </span>
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {member.user.is_online ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
