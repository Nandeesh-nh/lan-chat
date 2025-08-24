# 🚀 Modern LAN Chat & File Sharing

A beautiful, modern web-based chat application with file sharing capabilities built with **React**, **Tailwind CSS**, and **Python Flask**.

## ✨ Features

- **Modern UI/UX** - Beautiful interface with Tailwind CSS
- **Real-time Messaging** - Broadcast and private messages
- **File Sharing** - Send files up to 50MB
- **User Authentication** - Secure login/registration
- **Responsive Design** - Works on desktop and mobile
- **LAN-Only** - No internet required
- **Cross-Platform** - Access from any device with a browser

## 📁 Project Structure

```
lan-chat/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   └── ...
├── server.py              # Python Flask server
├── users.json             # User database (auto-created)
├── uploads/               # File storage (auto-created)
├── package.json           # Frontend dependencies
└── requirements.txt       # Backend dependencies
```

## 🔐 User Data Storage

**Location**: `users.json` file in the project root
**Format**: JSON with SHA-256 hashed passwords
**Example**:
```json
{
  "username": {
    "password": "hashed_password_here",
    "created": "2025-08-24T16:58:49.465887"
  }
}
```

## 🚀 Quick Start

### 1. Install Dependencies

**Backend (Python):**
```bash
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
npm install
```

### 2. Start the Server

**Terminal 1 - Backend:**
```bash
python server.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:5000
- **Mobile Access**: http://YOUR_IP:3000

## 📱 Mobile Access

1. **Start both servers** (backend and frontend)
2. **Get your IP address** from the server output
3. **Share the URL** with others on your network
4. **Access from mobile** - any device with a browser

## 🔧 Configuration

### File Upload Settings
- **Max File Size**: 50MB
- **Allowed Extensions**: txt, pdf, png, jpg, jpeg, gif, doc, docx, xls, xlsx, ppt, pptx, zip, rar
- **Storage Location**: `uploads/` folder

### Network Settings
- **Frontend Port**: 3000
- **Backend Port**: 5000
- **CORS**: Enabled for local development

## 🎨 UI Features

### Modern Design
- **Clean Interface** - Minimalist design with Tailwind CSS
- **Responsive Layout** - Adapts to any screen size
- **Dark/Light Mode** - Automatic theme detection
- **Smooth Animations** - Fade-in and slide-up effects

### User Experience
- **Real-time Updates** - Messages appear instantly
- **File Upload Modal** - Easy file selection and upload
- **User Status** - Online/offline indicators
- **Message History** - Last 100 messages preserved

## 🔒 Security Features

- **Password Hashing** - SHA-256 encryption
- **Input Validation** - Server-side validation
- **File Type Checking** - Whitelist of allowed extensions
- **File Size Limits** - Prevents abuse
- **Local Network Only** - No external internet access

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/logout` - User logout

### Messaging
- `GET /api/messages` - Get message history
- `POST /api/messages` - Send new message
- `GET /api/users` - Get online users

### File Sharing
- `POST /api/upload` - Upload file
- `GET /api/download/<filename>` - Download file

## 🛠️ Development

### Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development
```bash
# Start server with debug mode
python server.py

# Install development dependencies
pip install -r requirements.txt
```

## 📱 Browser Support

- ✅ Chrome (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)
- ✅ Opera (Desktop & Mobile)

## 🔧 Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
npm install  # For frontend
pip install -r requirements.txt  # For backend
```

**"Port already in use":**
- Change ports in `vite.config.js` (frontend)
- Change port in `server.py` (backend)

**"CORS errors":**
- Ensure both servers are running
- Check that CORS is enabled in `server.py`

**"File upload fails":**
- Check file size (max 50MB)
- Verify file extension is allowed
- Ensure `uploads/` folder exists

### Network Issues

**Can't access from mobile:**
1. Check firewall settings
2. Ensure devices are on same network
3. Use the correct IP address
4. Try accessing from desktop first

## 📈 Performance

- **Message History**: Limited to last 100 messages
- **File Storage**: Automatic cleanup of old files
- **User Sessions**: Auto-logout after 10 minutes of inactivity
- **Real-time Updates**: Polling every 2-3 seconds

## 🎯 Usage Scenarios

### Office Environment
- **Desktop users**: Access via browser
- **Mobile users**: Access via mobile browser
- **File sharing**: Documents, presentations, images
- **Private messaging**: Confidential discussions

### Classroom Environment
- **Students**: Access from phones/tablets
- **Teachers**: Access from computers
- **File sharing**: Assignments, resources
- **Broadcast messaging**: Announcements

### Home Network
- **Family chat**: Cross-device communication
- **File sharing**: Photos, documents
- **No internet dependency**: Works offline

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify all dependencies are installed
3. Ensure both servers are running
4. Check network connectivity

## 🎉 Ready to Use!

The application is **fully functional** and ready for immediate use. Simply follow the setup instructions above and start chatting!

---

**Built with ❤️ using React, Tailwind CSS, and Python Flask**
