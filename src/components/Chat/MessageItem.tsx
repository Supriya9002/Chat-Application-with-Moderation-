import React, { useState } from "react";
import { Flag, Trash2, MoreHorizontal } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { Message } from "./ChatArea";

interface MessageItemProps {
  message: Message;
  showAvatar: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showAvatar }) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);

  const isOwner = user?.id === message.user_id._id;
  const canModerate = user?.role === "moderator" || user?.role === "admin";

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "Invalid Date";
    }
  };

  const handleFlag = async (reason: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/messages/${message._id}/flag`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        setShowFlagModal(false);
        setShowActions(false);
      }
    } catch (error) {
      console.error("Error flagging message:", error);
    }
  };

  const handleDelete = async () => {
    try {
      console.log("Attempting to delete message:", message._id);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/messages/${message._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Delete response status:", response.status);

      if (response.ok) {
        console.log("Message deleted successfully");
        setShowActions(false);
        // The WebSocket event will handle the UI update
      } else {
        const errorData = await response.json();
        console.error("Delete failed:", errorData);
        alert(
          "Failed to delete message: " + (errorData.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Error deleting message: " + error);
    }
  };

  return (
    <div className="group relative w-full">
      <div className={`flex space-x-3 w-full ${showAvatar ? "" : "ml-12"}`}>
        {showAvatar && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
            style={{ backgroundColor: message.user_id.avatar_color }}
          >
            {message.user_id.username.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          {showAvatar && (
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="font-medium text-white">
                {message.user_id.username}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(message.created_at)}
              </span>
              {message.is_flagged && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-200">
                  <Flag className="w-3 h-3 mr-1" />
                  Flagged
                </span>
              )}
            </div>
          )}

          <div
            className={`text-gray-300 ${
              message.is_flagged ? "opacity-75" : ""
            } break-words whitespace-pre-wrap overflow-hidden max-w-full`}
            style={{
              wordBreak: "break-all",
              overflowWrap: "break-word",
              maxWidth: "100%",
              overflow: "hidden",
              hyphens: "auto",
              display: "block",
              width: "100%",
            }}
            onMouseEnter={() =>
              console.log(
                "Message content:",
                message.content,
                "Length:",
                message.content.length
              )
            }
          >
            {message.content}
          </div>
        </div>

        {/* Message Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-gray-500 hover:text-gray-300 rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-0 bg-gray-700 rounded-lg shadow-lg py-1 z-10 border border-gray-600">
              {!isOwner && (
                <button
                  onClick={() => setShowFlagModal(true)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 flex items-center space-x-2"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report</span>
                </button>
              )}

              {(isOwner || canModerate) && (
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-600 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h4 className="text-lg font-bold text-white mb-4">
              Report Message
            </h4>
            <div className="space-y-2">
              {["Spam", "Harassment", "Inappropriate Content", "Other"].map(
                (reason) => (
                  <button
                    key={reason}
                    onClick={() => handleFlag(reason)}
                    className="w-full p-3 text-left text-gray-300 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    {reason}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setShowFlagModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem;
