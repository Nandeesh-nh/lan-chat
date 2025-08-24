import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Send, 
  LogOut, 
  Users, 
  File, 
  Paperclip, 
  Download,
  X,
  MessageCircle,
  Wifi,
  WifiOff,
  Globe,
  User
} from 'lucide-react'

function Chat() {
  const { currentUser, logout } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [fileUpload, setFileUpload] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [showUsersList, setShowUsersList] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Simulate connection status
    setIsConnected(true)
    
    // Load initial data
    loadMessages()
    loadUsers()
    
    // Set up polling for real-time updates
    const messageInterval = setInterval(loadMessages, 2000)
    const userInterval = setInterval(loadUsers, 3000)
    
    return () => {
      clearInterval(messageInterval)
      clearInterval(userInterval)
    }
  }, [])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: currentUser.username,
          message: newMessage,
          target_user: selectedUser,
        }),
      })

      if (response.ok) {
        setNewMessage('')
        loadMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleFileUpload = async () => {
    if (!fileUpload || !selectedUser) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', fileUpload)
    formData.append('sender', currentUser.username)
    formData.append('target_user', selectedUser)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setFileUpload(null)
        setShowFileModal(false)
        loadMessages()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleFileDownload = async (filename, originalName) => {
    try {
      const response = await fetch(`/api/download/${filename}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = originalName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const switchToBroadcast = () => {
    setSelectedUser(null)
    setShowUsersList(false)
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">LAN Chat</h1>
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUsersList(!showUsersList)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Logged in as: <span className="font-medium">{currentUser.username}</span>
        </div>
      </div>

      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`${showUsersList ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col`}>
        {/* Desktop Header */}
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">LAN Chat</h1>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Logged in as: <span className="font-medium">{currentUser.username}</span>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-4 w-4 text-gray-500" />
              <h2 className="font-medium text-gray-900">Online Users</h2>
            </div>
            
            {/* Broadcast Option */}
            <button
              onClick={switchToBroadcast}
              className={`w-full text-left p-2 rounded-lg transition-colors mb-2 ${
                selectedUser === null
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">Broadcast Message</span>
              </div>
            </button>

            <div className="space-y-1">
              {users.map((user) => (
                <button
                  key={user}
                  onClick={() => {
                    setSelectedUser(user === selectedUser ? null : user)
                    setShowUsersList(false) // Close sidebar on mobile
                  }}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    selectedUser === user
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user}</span>
                    {user === currentUser.username && (
                      <span className="text-xs text-gray-500">(You)</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                {selectedUser ? (
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Chat with {selectedUser}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Broadcast Message</span>
                  </div>
                )}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedUser ? 'Private conversation' : 'Message all users'}
              </p>
            </div>
            {selectedUser && (
              <button
                onClick={() => setShowFileModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Send File</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === currentUser.username ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                  message.sender === currentUser.username
                    ? 'bg-primary-600 text-white'
                    : message.type === 'file'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'file' && (
                    <File className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-xs opacity-75 mb-1">
                      {message.sender} • {formatTime(message.timestamp)}
                    </div>
                    <div className="text-sm">
                      {message.type === 'file' ? (
                        <div className="flex items-center justify-between">
                          <span className="truncate">{message.message}</span>
                          <button 
                            onClick={() => handleFileDownload(message.filepath, message.filename)}
                            className="ml-2 p-1 hover:bg-yellow-200 rounded flex-shrink-0"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        message.message
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedUser ? `Message ${selectedUser}...` : "Type a message..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows="1"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="btn-primary flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send File to {selectedUser}</h3>
              <button
                onClick={() => setShowFileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFileUpload(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              {fileUpload && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700 truncate">{fileUpload.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Size: {(fileUpload.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFileModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!fileUpload || uploading}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Send File'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
