// socket.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000', {
    autoConnect: false, // Ensure manual connection if necessary
    withCredentials: true // Include credentials like cookies with the WebSocket request
});  // Initialize socket here

export default socket;