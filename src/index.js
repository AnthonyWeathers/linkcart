import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { UserStatusProvider } from "./components/UserStatusContext";
import { UserProvider } from "./components/UserContext";
import { FriendRequestProvider } from "./components/FriendRequestContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <BrowserRouter>
    <UserProvider>
      <UserStatusProvider>
        <FriendRequestProvider>
          <App />
        </FriendRequestProvider>
      </UserStatusProvider>
    </UserProvider>
  </BrowserRouter>
  // </React.StrictMode>
);
