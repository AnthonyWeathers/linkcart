import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import socket from "./socket";

const Community = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const fetchMessages = async () => {
    try {
      const response = await fetch("http://localhost:8000/community/messages", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const messages = await response.json();
        setMessages(messages.reverse());
      } else {
        const messages = await response.json();
        alert(messages.error);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    socket.on("message_response", (data) => {
      if (data.success) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: data.id,
            username: data.username,
            content: data.content,
            timestamp: data.timestamp,
          },
        ]);
      } else {
        alert(data.error);
      }
    });

    return () => {
      socket.off("message_response");
    };
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    socket.emit("message", {
      message: newMessage,
    });

    setNewMessage("");
  };

  return (
    <div className="community-container">
      <h1 className="community-header">Community Messages</h1>

      {/* Messages display */}
      <div className="messages-container">
        {messages.map((msg, index) => {
          // Check if this is the first message or the username has changed
          const showUsername =
            index === 0 || msg.username !== messages[index - 1].username;

          return (
            <div key={msg.id} className="message-item">
              {showUsername && (
                <Link
                  to={
                    msg.username === "Deleted User"
                      ? "/user-deleted"
                      : `/profile/${msg.username}`
                  }
                >
                  <strong>{msg.username}:</strong>
                </Link>
              )}
              <p>
                <span className="timestamp">
                  ({new Date(msg.timestamp).toLocaleTimeString()})
                </span>{" "}
                {msg.content}
              </p>
            </div>
          );
        })}
      </div>

      {/* Message input form */}
      <form className="message-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Community;
