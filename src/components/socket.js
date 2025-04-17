import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  autoConnect: false,
  withCredentials: true,
  // transports: ["polling"],
  // transports: ["websocket"],
  transports: ["websocket", "polling"], // Try both to see which one succeeds
});

export default socket;
