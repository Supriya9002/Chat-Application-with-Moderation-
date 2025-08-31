import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    original_content: {
      type: String, // Store original before moderation
    },
    is_flagged: {
      type: Boolean,
      default: false,
    },
    flagged_by: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        flagged_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    moderation_status: {
      type: String,
      enum: ["pending", "approved", "rejected", "auto_filtered"],
      default: "pending",
    },
    edited_at: Date,
    deleted_at: Date,
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ channel_id: 1, created_at: -1 });
messageSchema.index({ user_id: 1 });
messageSchema.index({ is_flagged: 1 });

export default mongoose.model("Message", messageSchema);
