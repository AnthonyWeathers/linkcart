function StatusToggle({ currentUser, isOnline, setIsOnline }) {
    const handleToggle = async () => {
        const token = localStorage.getItem('access_token');
        
        if (!isOnline) {
            // User is going online, connect to socket with token
            if (token) {
                socket.io.opts.query = { token };  // Pass token in connection query
                socket.connect();  // Connect the socket
            } else {
                console.error('Unable to connect due to missing token');
            }
        } else {
            // User is going offline, disconnect the socket
            socket.disconnect();
        }
    
        // Toggle the online status locally
        setIsOnline(prevState => !prevState);
    };    
  
    return (
      <div>
        <label>
          <input
            type="checkbox"
            checked={isOnline}
            onChange={handleToggle}
            disabled={!currentUser} // Only allow toggle if logged in
          />
          {isOnline ? 'Online' : 'Offline'}
        </label>
      </div>
    );
}
export default StatusToggle  