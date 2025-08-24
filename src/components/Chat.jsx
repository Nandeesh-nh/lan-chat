import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Send, LogOut, Users, File, Paperclip, Download, X, MessageCircle, Wifi, WifiOff,
  Globe, User, Edit, Trash2, MoreVertical, Plus
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
  const [showUsersList, setShowUsersList] = useState(false) // For mobile sidebar
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const [activeTabs, setActiveTabs] = useState([]) // Array of open chat tabs
  const [activeTab, setActiveTab] = useState(null) // Currently active tab
  const [unreadCounts, setUnreadCounts] = useState({}) // Track unread messages per tab
  const [lastMessageCounts, setLastMessageCounts] = useState({}) // Track message counts for comparison
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const messagesContainerRef = useRef(null) // For smart scrolling

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    // Only auto-scroll if user is at bottom
    const container = messagesContainerRef.current
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100
      if (isAtBottom) {
        scrollToBottom()
      }
    }
  }, [messages])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages?user=${currentUser.username}`) // Filter messages
      const data = await response.json()
      
      // Filter messages based on active tab
      let filteredMessages = data
      
      if (activeTab) {
        // Find the active tab
        const currentTab = activeTabs.find(tab => tab.id === activeTab)
        if (currentTab) {
          // For private chat tabs, only show messages between the two users
          filteredMessages = data.filter(message => {
            // For private messages, only show if both users are involved
            if (message.type === 'private' || message.target_user) {
              return (message.sender === currentUser.username && message.target_user === currentTab.user) ||
                     (message.sender === currentTab.user && message.target_user === currentUser.username)
            }
            
            // Don't show broadcast messages in private tabs
            return false
          })
        }
      } else {
        // For broadcast tab, only show broadcast messages (no system messages)
        filteredMessages = data.filter(message => 
          message.type === 'broadcast' || (!message.target_user && message.type !== 'private')
        )
      }
      
      setMessages(filteredMessages)
      setIsConnected(true)
      
      // Update unread counts
      updateUnreadCounts(data)
      
      // Mark messages as delivered when viewed
      markMessagesAsDelivered()
    } catch (error) {
      console.error('Error loading messages:', error)
      setIsConnected(false)
    }
  }

  const updateUnreadCounts = (allMessages) => {
    const newUnreadCounts = {}
    const newLastMessageCounts = {}
    
    // Count broadcast messages
    const broadcastMessages = allMessages.filter(message => 
      message.type === 'broadcast' || (!message.target_user && message.type !== 'private')
    )
    const broadcastCount = broadcastMessages.length
    newLastMessageCounts['broadcast'] = broadcastCount
    
    // If broadcast tab is not active, count unread
    if (!activeTab) {
      const lastCount = lastMessageCounts['broadcast'] || 0
      if (broadcastCount > lastCount) {
        newUnreadCounts['broadcast'] = (newUnreadCounts['broadcast'] || 0) + (broadcastCount - lastCount)
      }
    } else {
      newUnreadCounts['broadcast'] = 0
    }
    
    // Count private messages for each user
    activeTabs.forEach(tab => {
      const privateMessages = allMessages.filter(message => {
        if (message.type === 'private' || message.target_user) {
          return (message.sender === currentUser.username && message.target_user === tab.user) ||
                 (message.sender === tab.user && message.target_user === currentUser.username)
        }
        return false
      })
      
      const privateCount = privateMessages.length
      newLastMessageCounts[tab.id] = privateCount
      
      // If this tab is not active, count unread
      if (activeTab !== tab.id) {
        const lastCount = lastMessageCounts[tab.id] || 0
        if (privateCount > lastCount) {
          newUnreadCounts[tab.id] = (newUnreadCounts[tab.id] || 0) + (privateCount - lastCount)
        }
      } else {
        newUnreadCounts[tab.id] = 0
      }
    })
    
    setUnreadCounts(newUnreadCounts)
    setLastMessageCounts(newLastMessageCounts)
  }

  const markMessagesAsDelivered = async () => {
    try {
      const response = await fetch('/api/messages/mark-delivered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: currentUser.username,
          target_user: selectedUser, // For private chats
        }),
      })

      if (response.ok) {
        // Messages are now marked as delivered
        console.log('Messages marked as delivered')
      }
    } catch (error) {
      console.error('Error marking messages as delivered:', error)
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

  const editMessage = async (messageId, newText) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newText,
          user: currentUser.username,
        }),
      })

      if (response.ok) {
        setEditingMessage(null)
        setEditText('')
        loadMessages()
      }
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: currentUser.username,
        }),
      })

      if (response.ok) {
        setShowMessageMenu(null)
        loadMessages()
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleFileUpload = async () => {
    if (!fileUpload) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', fileUpload)
    formData.append('sender', currentUser.username)
    if (selectedUser) {
      formData.append('target_user', selectedUser)
    }

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

  const switchToBroadcast = () => {
    setSelectedUser(null)
    setActiveTab(null)
    setShowUsersList(false)
  }

  const openPrivateChat = (user) => {
    // Check if tab already exists
    const existingTab = activeTabs.find(tab => tab.user === user)
    if (!existingTab) {
      const newTab = {
        id: `tab_${Date.now()}`,
        user: user,
        title: `Chat with ${user}`
      }
      setActiveTabs([...activeTabs, newTab])
      setActiveTab(newTab.id)
    } else {
      setActiveTab(existingTab.id)
    }
    setSelectedUser(user)
    setShowUsersList(false)
  }

  const closeTab = (tabId) => {
    const newTabs = activeTabs.filter(tab => tab.id !== tabId)
    setActiveTabs(newTabs)

    // If we're closing the active tab, switch to broadcast or another tab
    if (activeTab === tabId) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1]
        setActiveTab(lastTab.id)
        setSelectedUser(lastTab.user)
      } else {
        setActiveTab(null)
        setSelectedUser(null)
      }
    }
  }

  const startEditing = (message) => {
    setEditingMessage(message.id)
    setEditText(message.message)
    setShowMessageMenu(null)
  }

  const cancelEditing = () => {
    setEditingMessage(null)
    setEditText('')
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
        // If sending a private message, open the tab for the recipient
        if (selectedUser) {
          openPrivateChat(selectedUser)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Load messages and users on component mount
  useEffect(() => {
    loadMessages()
    const interval = setInterval(() => {
      loadMessages()
    }, 2000)
    return () => clearInterval(interval)
  }, [activeTab]) // Add activeTab as dependency to reload when tab changes

  // Load users list
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const data = await response.json()
        setUsers(data.filter(user => user !== currentUser.username))
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }

    loadUsers()
    const interval = setInterval(loadUsers, 5000)
    return () => clearInterval(interval)
  }, [currentUser.username])

  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex-shrink-0">
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
      <div className={`${showUsersList ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0`}>
        {/* Desktop Header */}
        <div className="hidden lg:block p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
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
          <div className="mt-2 text-sm text-gray-600">
            Logged in as: <span className="font-medium">{currentUser.username}</span>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-500" />
            <span>Online Users</span>
          </h2>

          {/* Broadcast Option */}
          <button
            onClick={switchToBroadcast}
            className={`w-full text-left p-2 rounded-lg transition-colors mb-2 ${
              selectedUser === null && activeTab === null
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
            {users.map((user) => {
              // Check if user has unread messages
              const userTab = activeTabs.find(tab => tab.user === user)
              const hasUnread = userTab ? unreadCounts[userTab.id] > 0 : false
              
              return (
                <button
                  key={user}
                  onClick={() => openPrivateChat(user)}
                  className={`w-full text-left p-2 rounded-lg transition-colors relative ${
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
                    {/* Notification indicator for unread messages */}
                    {hasUnread && (
                      <div className="ml-auto h-2 w-2 bg-red-500 rounded-full"></div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Tabs */}
        {activeTabs.length > 0 && (
          <div className="bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center overflow-x-auto custom-scrollbar">
              {/* Broadcast Tab */}
              <button
                onClick={switchToBroadcast}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap relative ${
                  selectedUser === null && activeTab === null
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm">Broadcast</span>
                {/* Notification indicator for broadcast */}
                {unreadCounts['broadcast'] > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {unreadCounts['broadcast'] > 9 ? '9+' : unreadCounts['broadcast']}
                    </span>
                  </div>
                )}
              </button>

              {/* Private Chat Tabs */}
              {activeTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveTab(tab.id)
                      setSelectedUser(tab.user)
                    }}
                    className="flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm">{tab.user}</span>
                    {/* Notification indicator for private chat */}
                    {unreadCounts[tab.id] > 0 && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">
                          {unreadCounts[tab.id] > 9 ? '9+' : unreadCounts[tab.id]}
                        </span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => closeTab(tab.id)}
                    className="ml-1 p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
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
                {selectedUser
                  ? `You are chatting privately with ${selectedUser}`
                  : 'You are sending messages to everyone'}
              </p>
            </div>
            <button
              onClick={() => setShowFileModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Send File</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.sender === currentUser.username ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2 rounded-lg relative group ${
                  message.sender === currentUser.username
                    ? 'bg-primary-600 text-white'
                    : message.type === 'file'
                    ? 'bg-yellow-100 text-yellow-800'
                    : message.type === 'system'
                    ? 'bg-gray-100 text-gray-600 text-center mx-auto'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {/* Message Menu for own messages */}
                {message.sender === currentUser.username && message.type !== 'system' && (
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowMessageMenu(showMessageMenu === message.id ? null : message.id)}
                      className="bg-gray-800 text-white p-1 rounded-full hover:bg-gray-700"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>

                    {showMessageMenu === message.id && (
                      <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                        <button
                          onClick={() => startEditing(message)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center space-x-2"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-start space-x-2">
                  {message.type === 'file' && (
                    <File className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-xs opacity-75 mb-1 flex items-center space-x-2">
                      <span>{message.sender}</span>
                      {/* Delivery indicator for own messages */}
                      {message.sender === currentUser.username && !message.delivered && (
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                      <span>•</span>
                      <span>{formatTime(message.timestamp)}</span>
                      {message.edited && (
                        <>
                          <span>•</span>
                          <span className="italic">edited</span>
                        </>
                      )}
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
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows="1"
                style={{ minHeight: '40px', maxHeight: '120px' }}
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
        <div className="file-modal">
          <div className="file-modal-content">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send File</h3>
              <button
                onClick={() => setShowFileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFileUpload(e.target.files[0])}
              className="w-full mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFileModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!fileUpload || uploading}
                className="btn-primary"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="file-modal">
          <div className="file-modal-content">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Message</h3>
              <button
                onClick={cancelEditing}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none mb-4"
              rows="3"
              placeholder="Edit your message..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelEditing}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => editMessage(editingMessage, editText)}
                disabled={!editText.trim()}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
