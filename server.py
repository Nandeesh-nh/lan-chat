#!/usr/bin/env python3
"""
Modern LAN Chat Server with File Sharing
Supports React frontend with REST API and file uploads
"""

import os
import json
import hashlib
import socket
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import threading
import time

# Configure logging
logging.basicConfig(
    level=logging.WARNING,  # Changed from INFO to WARNING to reduce verbosity
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Suppress Flask's default logging
logging.getLogger('werkzeug').setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload directory: {UPLOAD_FOLDER}")

# Global state
users = {}
online_users = {}
messages = []
users_file = "users.json"

class UserManager:
    """Manages user data and authentication"""
    
    @staticmethod
    def load_users():
        """Load user data from JSON file"""
        global users
        if os.path.exists(users_file):
            try:
                with open(users_file, 'r') as f:
                    users = json.load(f)
                logger.info(f"Loaded {len(users)} users from {users_file}")
            except Exception as e:
                logger.error(f"Error loading users: {e}")
                users = {}
        else:
            logger.info(f"Users file not found, starting with empty user database")

    @staticmethod
    def save_users():
        """Save user data to JSON file"""
        try:
            with open(users_file, 'w') as f:
                json.dump(users, f, indent=2)
            logger.info(f"Saved {len(users)} users to {users_file}")
        except Exception as e:
            logger.error(f"Error saving users: {e}")

    @staticmethod
    def hash_password(password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def validate_user_data(username, password):
        """Validate user registration data"""
        if not username or not password:
            return False, "Please enter both username and password"
        
        if len(username) < 3:
            return False, "Username must be at least 3 characters"
        
        if len(password) < 6:
            return False, "Password must be at least 6 characters"
        
        if username in users:
            return False, "Username already exists"
        
        return True, "Valid"

class MessageManager:
    """Manages message operations"""
    
    @staticmethod
    def add_message(sender, message, target_user=None, message_type='broadcast'):
        """Add a new message to the chat"""
        message_data = {
            'id': f"{datetime.now().timestamp()}_{sender}",
            'type': message_type,
            'sender': sender,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'edited': False,
            'delivered': False  # Track delivery status
        }

        if target_user:
            message_data['target_user'] = target_user
            message_data['type'] = 'private'

        messages.append(message_data)
        logger.info(f"Added {message_type} message from {sender}")

        # Keep only last 100 messages
        if len(messages) > 100:
            messages[:] = messages[-100:]
            logger.info("Trimmed messages to last 100")

        return message_data

    @staticmethod
    def get_filtered_messages(requesting_user):
        """Get messages filtered for a specific user"""
        if not requesting_user:
            return []
        
        filtered_messages = []
        for message in messages:
            # Always show system messages
            if message.get('type') == 'system':
                filtered_messages.append(message)
            # Show broadcast messages
            elif message.get('type') == 'broadcast' or not message.get('target_user'):
                filtered_messages.append(message)
            # Show private messages where user is sender or receiver
            elif message.get('type') == 'private' or message.get('target_user'):
                if (message.get('sender') == requesting_user or 
                    message.get('target_user') == requesting_user):
                    filtered_messages.append(message)
        
        return filtered_messages

    @staticmethod
    def edit_message(message_id, new_message, requesting_user):
        """Edit a message"""
        for message in messages:
            if message.get('id') == message_id and message.get('sender') == requesting_user:
                message['message'] = new_message
                message['edited'] = True
                message['edited_at'] = datetime.now().isoformat()
                logger.info(f"Message {message_id} edited by {requesting_user}")
                return True
        return False

    @staticmethod
    def delete_message(message_id, requesting_user):
        """Delete a message"""
        for i, message in enumerate(messages):
            if message.get('id') == message_id and message.get('sender') == requesting_user:
                del messages[i]
                logger.info(f"Message {message_id} deleted by {requesting_user}")
                return True
        return False

    @staticmethod
    def mark_messages_as_delivered(requesting_user, target_user=None):
        """Mark messages as delivered when viewed by recipient"""
        marked_count = 0
        for message in messages:
            # For broadcast messages
            if not target_user and message.get('type') == 'broadcast':
                if (message.get('sender') != requesting_user and 
                    not message.get('delivered')):
                    message['delivered'] = True
                    marked_count += 1
            # For private messages
            elif target_user and message.get('type') == 'private':
                if ((message.get('sender') == requesting_user and 
                     message.get('target_user') == target_user) or
                    (message.get('sender') == target_user and 
                     message.get('target_user') == requesting_user)):
                    if not message.get('delivered'):
                        message['delivered'] = True
                        marked_count += 1
        
        if marked_count > 0:
            logger.info(f"Marked {marked_count} messages as delivered for {requesting_user}")
        return marked_count

class FileManager:
    """Manages file operations"""
    
    @staticmethod
    def allowed_file(filename):
        """Check if file extension is allowed"""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    @staticmethod
    def save_file(file, sender, target_user=None):
        """Save uploaded file and return file info"""
        if file.filename == '':
            return None, "No file selected"

        if not FileManager.allowed_file(file.filename):
            return None, "File type not allowed"

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return None, "File too large (max 50MB)"

        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{sender}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        try:
            file.save(filepath)
            logger.info(f"File saved: {unique_filename} ({file_size} bytes)")
            
            file_info = {
                'id': f"{datetime.now().timestamp()}_{sender}",
                'type': 'file',
                'sender': sender,
                'message': f'Sent file: {filename}',
                'filename': filename,
                'filepath': unique_filename,
                'filesize': file_size,
                'timestamp': datetime.now().isoformat(),
                'edited': False
            }

            if target_user:
                file_info['target_user'] = target_user

            messages.append(file_info)
            return file_info, None
            
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            return None, f"Error saving file: {str(e)}"

    @staticmethod
    def download_file(filename):
        """Download a file"""
        try:
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if not os.path.exists(file_path):
                return None, "File not found"
            
            # Extract original filename from the stored filename
            # Format: timestamp_sender_originalname
            parts = filename.split('_', 2)
            if len(parts) >= 3:
                original_name = parts[2]
            else:
                original_name = filename
                
            return file_path, original_name
            
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            return None, f"Error downloading file: {str(e)}"

class NetworkManager:
    """Manages network operations"""
    
    @staticmethod
    def get_local_ip():
        """Get local IP address"""
        try:
            temp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            temp_socket.connect(("8.8.8.8", 80))
            local_ip = temp_socket.getsockname()[0]
            temp_socket.close()
            return local_ip
        except:
            return "127.0.0.1"

# Initialize managers
UserManager.load_users()

# API Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Handle user registration"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid request data'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')

        is_valid, message = UserManager.validate_user_data(username, password)
        if not is_valid:
            return jsonify({'success': False, 'message': message})

        # Hash password and save user
        hashed_password = UserManager.hash_password(password)
        users[username] = {
            'password': hashed_password,
            'created': datetime.now().isoformat()
        }

        UserManager.save_users()
        logger.info(f"New user registered: {username}")
        return jsonify({'success': True, 'message': 'Registration successful!'})
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'success': False, 'message': 'Server error during registration'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Handle user login"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid request data'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'success': False, 'message': 'Please enter both username and password'})

        if username not in users:
            return jsonify({'success': False, 'message': 'Username not found'})

        hashed_password = UserManager.hash_password(password)

        if users[username]['password'] != hashed_password:
            return jsonify({'success': False, 'message': 'Incorrect password'})

        # Add user to online users
        online_users[username] = {
            'joined': datetime.now().isoformat(),
            'last_seen': datetime.now().isoformat()
        }

        # Remove system message for joining
        # MessageManager.add_message('System', f'{username} joined the chat', message_type='system')

        logger.info(f"User logged in: {username}")
        return jsonify({
            'success': True,
            'user': {
                'username': username,
                'created': users[username]['created']
            }
        })
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'Server error during login'}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get list of online users"""
    try:
        # Update last seen for all users
        current_time = datetime.now().isoformat()
        for username in online_users:
            online_users[username]['last_seen'] = current_time

        return jsonify(list(online_users.keys()))
        
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        return jsonify([])

@app.route('/api/heartbeat', methods=['POST'])
def heartbeat():
    """Update user's last seen timestamp to keep them online"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid request data'}), 400
        
        username = data.get('username', '').strip()
        if not username:
            return jsonify({'success': False, 'message': 'Username required'}), 400
        
        if username in online_users:
            online_users[username]['last_seen'] = datetime.now().isoformat()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'User not found in online users'}), 404
            
    except Exception as e:
        logger.error(f"Heartbeat error: {e}")
        return jsonify({'success': False, 'message': 'Server error processing heartbeat'}), 500

@app.route('/api/messages', methods=['GET', 'POST'])
def handle_messages():
    """Handle messages - GET for retrieving, POST for sending"""
    try:
        if request.method == 'GET':
            # Get the requesting user from query parameter
            requesting_user = request.args.get('user', '').strip()
            
            if not requesting_user:
                return jsonify({'success': False, 'message': 'User parameter required'}), 400
            
            filtered_messages = MessageManager.get_filtered_messages(requesting_user)
            return jsonify(filtered_messages)
        
        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'Invalid request data'}), 400
            
            sender = data.get('sender', '').strip()
            message = data.get('message', '').strip()
            target_user = data.get('target_user')
            
            # Handle None target_user properly
            if target_user is not None:
                target_user = target_user.strip()

            if not sender or not message:
                return jsonify({'success': False, 'message': 'Invalid message'})

            # Add message to history
            message_type = 'private' if target_user else 'broadcast'
            MessageManager.add_message(sender, message, target_user, message_type)

            return jsonify({'success': True})
            
    except Exception as e:
        logger.error(f"Message handling error: {e}")
        return jsonify({'success': False, 'message': 'Server error processing message'}), 500

@app.route('/api/messages/<message_id>', methods=['PUT', 'DELETE'])
def edit_delete_message(message_id):
    """Edit or delete a message"""
    try:
        if request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'Invalid request data'}), 400
            
            new_message = data.get('message', '').strip()
            requesting_user = data.get('user', '').strip()
            
            if not new_message or not requesting_user:
                return jsonify({'success': False, 'message': 'Invalid request'}), 400
            
            if MessageManager.edit_message(message_id, new_message, requesting_user):
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'message': 'Message not found or unauthorized'}), 404
        
        elif request.method == 'DELETE':
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'Invalid request data'}), 400
            
            requesting_user = data.get('user', '').strip()
            
            if not requesting_user:
                return jsonify({'success': False, 'message': 'User parameter required'}), 400
            
            if MessageManager.delete_message(message_id, requesting_user):
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'message': 'Message not found or unauthorized'}), 404
                
    except Exception as e:
        logger.error(f"Edit/delete message error: {e}")
        return jsonify({'success': False, 'message': 'Server error processing request'}), 500

@app.route('/api/messages/mark-delivered', methods=['POST'])
def mark_messages_delivered():
    """Mark messages as delivered when viewed"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid request data'}), 400
        
        requesting_user = data.get('user', '').strip()
        target_user = data.get('target_user')  # Optional, for private chats
        
        if not requesting_user:
            return jsonify({'success': False, 'message': 'User parameter required'}), 400
        
        marked_count = MessageManager.mark_messages_as_delivered(requesting_user, target_user)
        return jsonify({'success': True, 'marked_count': marked_count})
        
    except Exception as e:
        logger.error(f"Mark delivered error: {e}")
        return jsonify({'success': False, 'message': 'Server error marking messages as delivered'}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file uploads"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400

        file = request.files['file']
        sender = request.form.get('sender', '').strip()
        target_user = request.form.get('target_user')
        
        # Handle None target_user properly
        if target_user is not None:
            target_user = target_user.strip()

        if not sender:
            return jsonify({'success': False, 'message': 'Missing sender'}), 400

        file_info, error = FileManager.save_file(file, sender, target_user)
        if error:
            return jsonify({'success': False, 'message': error}), 400

        return jsonify({'success': True, 'filename': file_info['filepath']})
        
    except Exception as e:
        logger.error(f"File upload error: {e}")
        return jsonify({'success': False, 'message': 'Server error uploading file'}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download uploaded files"""
    try:
        file_path, original_name = FileManager.download_file(filename)
        if not file_path:
            return jsonify({'success': False, 'message': original_name}), 404
            
        return send_file(
            file_path,
            as_attachment=True,
            download_name=original_name,
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        logger.error(f"File download error: {e}")
        return jsonify({'success': False, 'message': 'Server error downloading file'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle user logout"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid request data'}), 400
        
        username = data.get('username', '').strip()

        if username in online_users:
            del online_users[username]
            # Remove system message for leaving
            # MessageManager.add_message('System', f'{username} left the chat', message_type='system')
            logger.info(f"User logged out: {username}")

        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'success': False, 'message': 'Server error during logout'}), 500

# Cleanup inactive users every 5 minutes
def cleanup_inactive_users():
    """Remove users who haven't been seen for more than 10 minutes"""
    while True:
        try:
            time.sleep(300)  # 5 minutes
            current_time = datetime.now()
            inactive_users = []

            for username, user_data in online_users.items():
                last_seen = datetime.fromisoformat(user_data['last_seen'])
                if (current_time - last_seen).total_seconds() > 600:  # 10 minutes
                    inactive_users.append(username)

            for username in inactive_users:
                del online_users[username]
                # Remove system message for disconnection
                # MessageManager.add_message('System', f'{username} disconnected', message_type='system')
                logger.info(f"Removed inactive user: {username}")
                
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_inactive_users, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    local_ip = NetworkManager.get_local_ip()
    logger.info("Modern LAN Chat Server Starting...")
    logger.info(f"Frontend: http://localhost:3000")
    logger.info(f"API Server: http://{local_ip}:5000")
    logger.info(f"File Storage: {UPLOAD_FOLDER}/")
    logger.info(f"Online Users: {len(online_users)}")
    logger.info(f"Total Messages: {len(messages)}")
    logger.info(f"Press Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
