import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Community = ({ currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    // After setting up public and private messaging and testing it
    // Look into implementing WebSockets through Socket.IO or Pusher to enable real-time messaging where users see new messages without
    // needing to refresh 

    // Eventually make a private message component for friend dms

    // Fetch the messages from the backend
    const fetchMessages = async () => {
        try {
            const response = await fetch('http://localhost:8000/messages/community');
            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    useEffect(() => {
        // Fetch messages when the component mounts
        fetchMessages();
    }, []);

    // Handle sending a new message
    const sendMessage = async () => {
        if (newMessage.trim() === '') return; // Prevent empty messages

        try {
            const response = await fetch('http://localhost:8000/messages/community', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: newMessage
                }),
                credentials: 'include'  // This ensures cookies (like session cookies) are sent with the request
            });
            if (response.ok) {
                // Refresh the messages after sending the new message
                fetchMessages();
                setNewMessage(''); // Clear the input field
            } else {
                console.error("Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div>
            <h1>Community Messages</h1>

            {/* Messages display */}
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className="message-item">
                        <Link to={`/profile/${msg.username}`}>
                            <strong>{msg.username}:</strong>
                        </Link>
                        <p>{msg.message}</p>
                    </div>
                ))}
            </div>

            {/* Message input form */}
            <div className="message-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
};

export default Community;
