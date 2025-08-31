# Real-Time Chat Application with Moderation

A full-stack real-time chat application built with the MERN stack, featuring automated content moderation, WebSocket-based real-time communication, and comprehensive user management.

## 🚀 Features

### Core Functionality
- **Real-time messaging** with WebSocket support
- **Multi-channel chat** with member management
- **User authentication** with JWT tokens
- **Online/offline status** indicators
- **Typing indicators** for real-time feedback
- **Message history** with pagination

### Content Moderation
- **Automated profanity filtering** with customizable word lists
- **Spam detection** with rate limiting and pattern recognition
- **Message flagging system** for user reporting
- **Automatic content filtering** with original content preservation
- **Moderation status tracking** (pending, approved, rejected, auto_filtered)

### User Management
- **Role-based access control** (user, moderator, admin)
- **User banning system** with temporary/permanent bans
- **Profile management** with avatar colors
- **Channel membership** with admin/member roles

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **bad-words** for profanity filtering

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Socket.io-client** for WebSocket communication
- **Lucide React** for icons
- **React Emoji Render** for emoji support

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd chat-application-with-moderation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/chatapp

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Client URL
CLIENT_URL=http://localhost:5173

```

### 4. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# For local MongoDB
mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

### 5. Run the Application
```bash
# Development mode (runs both server and client)
npm run dev

# Or run separately:
npm run server  # Backend only (port 3001)
npm run client  # Frontend only (port 5173)
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.
```json
{
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/logout
Logout user and invalidate session.

### User Endpoints

#### GET /api/users/profile
Get current user profile (requires authentication).

#### PUT /api/users/profile
Update user profile (requires authentication).

### Channel Endpoints

#### POST /api/channels
Create a new channel.
```json
{
  "name": "string",
  "description": "string",
  "is_private": boolean
}
```

#### GET /api/channels
Get user's channels (requires authentication).

#### GET /api/channels/public
Get public channels available to join.

#### POST /api/channels/:id/join
Join a public channel.

#### DELETE /api/channels/:id/leave
Leave a channel.

#### GET /api/channels/:id/members
Get channel members.

### Message Endpoints

#### GET /api/channels/:id/messages
Get channel message history with pagination.
```
Query parameters: page, limit
```

#### POST /api/channels/:id/messages
Send a message to a channel.
```json
{
  "content": "string"
}
```

#### PUT /api/messages/:id/flag
Flag a message as inappropriate.
```json
{
  "reason": "string"
}
```

#### DELETE /api/messages/:id
Delete a message (author or moderator only).

## 🔌 WebSocket Events

### Client to Server Events

#### `send-message`
Send a real-time message.
```json
{
  "channelId": "string",
  "content": "string"
}
```

#### `typing` / `stop-typing`
Indicate typing status.
```json
{
  "channelId": "string"
}
```

#### `join-channel`
Join a channel room.
```json
{
  "channelId": "string"
}
```

#### `leave-channel`
Leave a channel room.
```json
{
  "channelId": "string"
}
```

#### `user-activity`
Update user activity timestamp.

### Server to Client Events

#### `new-message`
Receive a new message.
```json
{
  "_id": "string",
  "content": "string",
  "user_id": {
    "username": "string",
    "avatar_color": "string"
  },
  "created_at": "date"
}
```

#### `typing-update`
Receive typing indicators.
```json
{
  "channelId": "string",
  "typingUsers": [
    {
      "userId": "string",
      "username": "string"
    }
  ]
}
```

#### `message-sent`
Confirmation of sent message.
```json
{
  "messageId": "string",
  "moderation": {
    "flagged": boolean,
    "reason": "string"
  }
}
```

#### `message-deleted`
Notification of deleted message.
```json
{
  "messageId": "string"
}
```

#### `channel-joined`
Confirmation of channel join.
```json
{
  "channelId": "string"
}
```

## 🛡️ Content Moderation

### Automatic Filtering
- **Profanity Detection**: Uses customizable word lists
- **Spam Prevention**: Rate limiting and pattern recognition
- **Content Analysis**: Length, repetition, and pattern checks

### Manual Moderation
- **User Reporting**: Flag inappropriate messages
- **Moderator Actions**: Delete messages, ban users
- **Audit Trail**: Track all moderation actions

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Message Sending**: 20 messages per minute
- **Spam Score**: Dynamic scoring based on user behavior

## 🏗️ Architecture

### Database Schema

#### User Model
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: String (user/moderator/admin),
  banned_until: Date,
  last_seen: Date,
  is_online: Boolean,
  avatar_color: String
}
```

#### Channel Model
```javascript
{
  name: String,
  description: String,
  is_private: Boolean,
  created_by: ObjectId (ref: User),
  members: [{
    user: ObjectId (ref: User),
    role: String (member/admin),
    joined_at: Date
  }],
  last_activity: Date
}
```

#### Message Model
```javascript
{
  channel_id: ObjectId (ref: Channel),
  user_id: ObjectId (ref: User),
  content: String,
  original_content: String,
  is_flagged: Boolean,
  flagged_by: [{
    user: ObjectId (ref: User),
    reason: String,
    flagged_at: Date
  }],
  moderation_status: String,
  edited_at: Date,
  deleted_at: Date
}
```

### WebSocket Architecture
- **Authentication**: JWT-based socket authentication
- **Room Management**: Channel-based rooms for message broadcasting
- **Connection Handling**: Automatic reconnection and status updates
- **Typing Indicators**: Real-time typing status with cleanup

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Rate Limiting**: Multiple layers of rate limiting
- **Input Validation**: Comprehensive input sanitization
- **CORS Configuration**: Proper cross-origin resource sharing

## 🚀 Deployment

### Environment Variables
Ensure all environment variables are properly configured for production:
- Use strong JWT secrets
- Configure production MongoDB URI
- Set appropriate rate limiting values
- Enable HTTPS in production

### Performance Considerations
- **Database Indexing**: Optimized indexes for message queries
- **Connection Pooling**: MongoDB connection optimization
- **Memory Management**: Proper cleanup of WebSocket connections
- **Scalability**: Horizontal scaling ready with Redis for session storage



## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the WebSocket events documentation

## 🔮 Future Enhancements

- **File Upload**: Support for image and file sharing
- **Voice Messages**: Audio message support
- **Video Calls**: WebRTC integration
- **Advanced Moderation**: AI-powered content analysis
- **Mobile App**: React Native mobile application
- **Analytics Dashboard**: User activity and moderation analytics
