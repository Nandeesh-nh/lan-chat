# Modern LAN Chat & File Sharing Application

A complete web-based LAN chat and file sharing application built with React, Tailwind CSS, and Python Flask. Perfect for office/classroom environments with real-time messaging, file sharing, and mobile-responsive design.

## ✨ Features

### 💬 Messaging
- **Real-time messaging** with automatic updates
- **Broadcast messages** to all users
- **Private conversations** between specific users
- **Message editing and deletion** (for your own messages)
- **System notifications** for user join/leave events

### 📁 File Sharing
- **File upload and download** support
- **Multiple file types** (documents, images, archives)
- **File sharing in both broadcast and private chats**
- **Secure file storage** with unique naming
- **File size validation** (max 50MB)

### 📱 Mobile Experience
- **Fully responsive design** for all devices
- **Touch-friendly interface** with proper button sizes
- **Mobile-optimized navigation** with collapsible sidebar
- **Fixed header and input areas** for better UX
- **Smart auto-scroll** that respects user position

### 🔐 Security & Privacy
- **SHA-256 password hashing** for secure storage
- **Private chat filtering** - messages only visible to participants
- **User authentication** with session management
- **File type validation** for security

## 🗂️ Data Storage Locations

### 📊 User Data
- **File**: `users.json`
- **Location**: Project root directory
- **Content**: Username, hashed passwords, account creation timestamps
- **Format**: JSON
- **Example**:
```json
{
  "username": {
    "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    "created": "2025-08-24T16:58:49.465887"
  }
}
```

### 💬 Messages
- **Storage**: In-memory (server restart clears messages)
- **Backend**: `server.py` - `messages` list
- **Format**: JSON objects with timestamps, sender, content, type
- **Persistence**: Messages are not saved to disk (ephemeral)

### 📁 Uploaded Files
- **Directory**: `uploads/`
- **Location**: Project root directory
- **Naming**: `timestamp_sender_originalname.ext`
- **Example**: `20250824_175300_username_document.pdf`
- **Access**: Via `/api/download/filename` endpoint

### 🗄️ Server State
- **Online Users**: In-memory tracking in `server.py`
- **Active Sessions**: Managed in `online_users` dictionary
- **File Storage**: Physical files in `uploads/` directory
- **User Accounts**: Persistent in `users.json`

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Node.js 14+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd lan-chat
```

2. **Install backend dependencies**
```bash
pip install -r requirements.txt
```

3. **Install frontend dependencies**
```bash
npm install
```

### Running the Application

#### Option 1: Manual Start
1. **Start the backend server**
```bash
python server.py
```

2. **Start the frontend development server**
```bash
npm run dev -- --host
```

#### Option 2: Using the Start Script (Windows)
```bash
start.bat
```

### Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Mobile Access**: http://[your-ip]:3000

## 📱 Mobile Access

### From Mobile Devices
1. Ensure your mobile device is on the same WiFi network
2. Find your computer's IP address (displayed in server startup)
3. Open browser and navigate to: `http://[your-ip]:3000`
4. Register/login and start chatting!

### Network Configuration
- **Frontend**: Automatically exposes to network with `--host` flag
- **Backend**: Binds to `0.0.0.0:5000` for network access
- **Firewall**: May need to allow connections on ports 3000 and 5000

## 🛠️ Configuration

### File Upload Settings
```python
# server.py
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
```

### Server Settings
```python
# server.py
app.run(host='0.0.0.0', port=5000, debug=False)
```

### Frontend Settings
```javascript
// vite.config.js
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:5000',
    '/socket.io': 'http://localhost:5000'
  }
}
```

## 🎨 UI/UX Features

### Design System
- **Framework**: Tailwind CSS
- **Icons**: Lucide React
- **Colors**: Custom primary color palette
- **Typography**: Inter font family
- **Animations**: Smooth transitions and hover effects

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations
- **Touch targets**: Minimum 44px for buttons
- **Fixed positioning**: Header and input areas
- **Collapsible sidebar**: Hidden by default on mobile
- **Optimized scrolling**: Smart auto-scroll behavior

## 🔒 Security Features

### Password Security
- **Hashing**: SHA-256 algorithm
- **Storage**: Hashed passwords only
- **Validation**: Minimum 6 characters required

### File Security
- **Type validation**: Whitelist of allowed extensions
- **Size limits**: 50MB maximum file size
- **Secure naming**: Timestamp-based unique filenames
- **Path sanitization**: Using `secure_filename`

### Privacy
- **Private messages**: Only visible to sender and recipient
- **User filtering**: Messages filtered by user permissions
- **Session management**: Automatic cleanup of inactive users

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/logout` - User logout

### Messaging
- `GET /api/messages?user=username` - Get filtered messages
- `POST /api/messages` - Send new message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Users
- `GET /api/users` - Get online users list

### File Operations
- `POST /api/upload` - Upload file
- `GET /api/download/:filename` - Download file

## 🧪 Development

### Project Structure
```
lan-chat/
├── src/
│   ├── components/
│   │   ├── Chat.jsx          # Main chat interface
│   │   ├── Login.jsx         # Login component
│   │   └── Register.jsx      # Registration component
│   ├── contexts/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # App entry point
│   └── index.css             # Global styles
├── server.py                 # Flask backend server
├── users.json                # User data storage
├── uploads/                  # File storage directory
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

### Key Technologies
- **Frontend**: React 18, Tailwind CSS, Vite
- **Backend**: Python Flask, Flask-CORS
- **File Handling**: Werkzeug secure_filename
- **Authentication**: SHA-256 hashing
- **Real-time**: Polling-based updates

## 🌐 Browser Support

### Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Mobile Browsers
- **iOS Safari**: 14+
- **Chrome Mobile**: 90+
- **Samsung Internet**: 14+

## 🔧 Troubleshooting

### Common Issues

#### Frontend Not Loading
- Check if `npm run dev` is running
- Verify port 3000 is not in use
- Check browser console for errors

#### Backend Connection Issues
- Ensure `python server.py` is running
- Check if port 5000 is available
- Verify firewall settings

#### File Upload Fails
- Check file size (max 50MB)
- Verify file type is allowed
- Ensure `uploads/` directory exists

#### Mobile Access Issues
- Verify devices are on same network
- Check IP address is correct
- Ensure `--host` flag is used for frontend

### Performance Optimization
- **Message limit**: Only last 100 messages kept in memory
- **User cleanup**: Inactive users removed after 10 minutes
- **File cleanup**: Manual cleanup of old files recommended

## 📊 Usage Scenarios

### Office Environment
- **Team communication**: Broadcast messages to all staff
- **Private discussions**: One-on-one conversations
- **Document sharing**: Quick file transfers
- **Meeting coordination**: Real-time updates

### Classroom Setting
- **Student collaboration**: Group discussions
- **Assignment sharing**: File distribution
- **Teacher-student communication**: Private messaging
- **Resource sharing**: Educational materials

### Small Teams
- **Project coordination**: Task updates
- **File collaboration**: Shared document access
- **Quick communication**: Instant messaging
- **Remote work**: Local network access

## 🔄 Updates & Maintenance

### Data Backup
- **User accounts**: Backup `users.json` regularly
- **Uploaded files**: Copy `uploads/` directory
- **Configuration**: Document any custom settings

### Server Maintenance
- **Restart**: Messages will be cleared
- **File cleanup**: Remove old files from `uploads/`
- **User management**: Monitor `users.json` size

### Security Updates
- **Dependencies**: Keep packages updated
- **File permissions**: Secure `uploads/` directory
- **Network security**: Use firewall rules

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check browser console for errors
4. Verify network connectivity

---

**Note**: This application is designed for local network use. For production deployment, consider additional security measures and proper hosting infrastructure.
