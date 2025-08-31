import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 200,
    },
    is_private: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["member", "admin"],
          default: "member",
        },
        joined_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    last_activity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

channelSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => member.user.toString() === userId.toString()
  );
};

channelSchema.methods.isAdmin = function (userId) {
  const member = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );
  return member && member.role === "admin";
};

export default mongoose.model("Channel", channelSchema);
