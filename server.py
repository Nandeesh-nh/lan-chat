#!/usr/bin/env python3
"""
Modern LAN Chat Server with File Sharing
Supports React frontend with REST API and file uploads
"""

import os
import json
import hashlib
import socket
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import threading
import time

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Global state
users = {}
online_users = {}
messages = []
users_file = "users.json"

def load_users():
    """Load user data from JSON file"""
    global users
    if os.path.exists(users_file):
        try:
            with open(users_file, 'r') as f:
                users = json.load(f)
        except:
            users = {}

def save_users():
    """Save user data to JSON file"""
    with open(users_file, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

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

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Load existing users
load_users()

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Handle user registration"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Please enter both username and password'})

    if len(username) < 3:
        return jsonify({'success': False, 'message': 'Username must be at least 3 characters'})

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'})

    if username in users:
        return jsonify({'success': False, 'message': 'Username already exists'})

    # Hash password and save user
    hashed_password = hash_password(password)
    users[username] = {
        'password': hashed_password,
        'created': datetime.now().isoformat()
    }

    save_users()
    return jsonify({'success': True, 'message': 'Registration successful!'})

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Handle user login"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Please enter both username and password'})

    if username not in users:
        return jsonify({'success': False, 'message': 'Username not found'})

    hashed_password = hash_password(password)

    if users[username]['password'] != hashed_password:
        return jsonify({'success': False, 'message': 'Incorrect password'})

    # Add user to online users
    online_users[username] = {
        'joined': datetime.now().isoformat(),
        'last_seen': datetime.now().isoformat()
    }

    # Add system message
    messages.append({
        'type': 'system',
        'sender': 'System',
        'message': f'{username} joined the chat',
        'timestamp': datetime.now().isoformat()
    })

    return jsonify({
        'success': True,
        'user': {
            'username': username,
            'created': users[username]['created']
        }
    })

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get list of online users"""
    # Update last seen for all users
    current_time = datetime.now().isoformat()
    for username in online_users:
        online_users[username]['last_seen'] = current_time

    return jsonify(list(online_users.keys()))

@app.route('/api/messages', methods=['GET', 'POST'])
def handle_messages():
    """Handle messages - GET for retrieving, POST for sending"""
    if request.method == 'GET':
        return jsonify(messages)
    
    elif request.method == 'POST':
        data = request.get_json()
        sender = data.get('sender', '').strip()
        message = data.get('message', '').strip()
        target_user = data.get('target_user', '').strip()

        if not sender or not message:
            return jsonify({'success': False, 'message': 'Invalid message'})

        # Add message to history
        message_data = {
            'type': 'private' if target_user else 'broadcast',
            'sender': sender,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }

        if target_user:
            message_data['target_user'] = target_user

        messages.append(message_data)

        # Keep only last 100 messages
        if len(messages) > 100:
            messages[:] = messages[-100:]

        return jsonify({'success': True})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file uploads"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    sender = request.form.get('sender', '').strip()
    target_user = request.form.get('target_user', '').strip()

    if not sender or not target_user:
        return jsonify({'success': False, 'message': 'Missing sender or target user'}), 400

    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'File type not allowed'}), 400

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        return jsonify({'success': False, 'message': 'File too large (max 50MB)'}), 400

    # Save file
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{timestamp}_{sender}_{filename}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    
    try:
        file.save(filepath)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error saving file: {str(e)}'}), 500

    # Add file message to chat
    file_message = {
        'type': 'file',
        'sender': sender,
        'message': f'Sent file: {filename}',
        'filename': filename,
        'filepath': unique_filename,
        'filesize': file_size,
        'target_user': target_user,
        'timestamp': datetime.now().isoformat()
    }

    messages.append(file_message)

    # Keep only last 100 messages
    if len(messages) > 100:
        messages[:] = messages[-100:]

    return jsonify({'success': True, 'filename': unique_filename})

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download uploaded files"""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': 'File not found'}), 404
        
        # Extract original filename from the stored filename
        # Format: timestamp_sender_originalname
        parts = filename.split('_', 2)
        if len(parts) >= 3:
            original_name = parts[2]
        else:
            original_name = filename
            
        return send_file(
            file_path,
            as_attachment=True,
            download_name=original_name,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error downloading file: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle user logout"""
    data = request.get_json()
    username = data.get('username', '').strip()

    if username in online_users:
        del online_users[username]

        # Add system message
        messages.append({
            'type': 'system',
            'sender': 'System',
            'message': f'{username} left the chat',
            'timestamp': datetime.now().isoformat()
        })

    return jsonify({'success': True})

# Cleanup inactive users every 5 minutes
def cleanup_inactive_users():
    """Remove users who haven't been seen for more than 10 minutes"""
    while True:
        time.sleep(300)  # 5 minutes
        current_time = datetime.now()
        inactive_users = []

        for username, user_data in online_users.items():
            last_seen = datetime.fromisoformat(user_data['last_seen'])
            if (current_time - last_seen).total_seconds() > 600:  # 10 minutes
                inactive_users.append(username)

        for username in inactive_users:
            del online_users[username]
            messages.append({
                'type': 'system',
                'sender': 'System',
                'message': f'{username} disconnected',
                'timestamp': datetime.now().isoformat()
            })

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_inactive_users, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    local_ip = get_local_ip()
    print(f"🚀 Modern LAN Chat Server Starting...")
    print(f"📱 Frontend: http://localhost:3000")
    print(f"🔧 API Server: http://{local_ip}:5000")
    print(f"📁 File Storage: {UPLOAD_FOLDER}/")
    print(f"👥 Online Users: {len(online_users)}")
    print(f"💬 Total Messages: {len(messages)}")
    print(f"🔄 Press Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
