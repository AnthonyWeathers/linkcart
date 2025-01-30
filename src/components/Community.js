import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import socket from './socket';

const Community = ({ currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    // Fetch the messages from the backend
    const fetchMessages = async () => {
        try {
            const response = await fetch('http://localhost:8000/messages/community', {
                method: 'GET',
                credentials: 'include', // Include credentials for session management
            });
            if(response.ok) {
                const messages = await response.json();
                // setMessages(messages);
                // Reverse the order for display (oldest first, newest last)
                setMessages(messages.reverse());
            }
            else {
                const messages = await response.json();
                alert(messages.error)
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    useEffect(() => {
        // Fetch messages when the component mounts
        fetchMessages();
    }, [])

    useEffect(() => {
        socket.on('message_response', (data) => {
            console.log("Received message from server: ", data);
            if (data.success) {
                setMessages(prevMessages => [...prevMessages, {
                    id: data.id,
                    username: data.username,
                    content: data.content,
                    timestamp: data.timestamp
                }]);
            } else {
                alert(data.error)
            }
        });

        // Cleanup on component unmount
        return () => {
            socket.off('message_response');
        };
    }, []);  // Empty array ensures it only runs on mount

    // Handle sending a new message
    const sendMessage = async e => {
        e.preventDefault();
        if (newMessage.trim() === '') return; // Prevent empty messages
        // Emit the new message to the server
        socket.emit('message', {
            message: newMessage
        });

        setNewMessage(''); // Clear the input field
    };

    return (
        <div className="community-container">
            <h1 className='community-header'>Community Messages</h1>

            {/* Messages display */}
            <div className="messages-container">
                {messages.map((msg, index) => {
                    // Check if this is the first message or the username has changed
                    const showUsername = index === 0 || msg.username !== messages[index - 1].username;
        
                    return (
                        <div key={msg.id} className="message-item">
                            {showUsername && (
                                // <Link to={`/profile/${msg.username}`}>
                                <Link to={msg.username === "Deleted User" ? "/user-deleted" : `/profile/${msg.username}`}>
                                    <strong>{msg.username}:</strong>
                                </Link>
                            )}
                            <p>
                            <span className="timestamp">({new Date(msg.timestamp).toLocaleTimeString()})</span> {msg.content}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Message input form */}
            <form
                className="message-input"
                onSubmit={sendMessage}
            >
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button> {/* Change button type to submit */}
            </form>
        </div>
    );
};

export default Community
