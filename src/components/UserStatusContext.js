import React, { createContext, useState } from "react";
import socket from './socket';

// Create the context
export const UserStatusContext = createContext();

// Create the provider
export const UserStatusProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(false);

    const toggleStatus = () => {
        // setIsOnline((prev) => !prev);
        if (!isOnline) {
            socket.connect(); // Backend handles setting isOnline to true
            setIsOnline(true); // Update local state
        } else {
            socket.disconnect(); // Backend handles setting isOnline to false
            setIsOnline(false); // Update local state
        }
    };

    return (
        <UserStatusContext.Provider value={{ isOnline, toggleStatus }}>
            {children}
        </UserStatusContext.Provider>
    );
};