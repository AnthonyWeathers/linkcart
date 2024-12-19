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
        } else {
            socket.disconnect(); // Backend handles setting isOnline to false
        }
    };

    return (
        <UserStatusContext.Provider value={{ isOnline, setIsOnline, toggleStatus }}>
            {children}
        </UserStatusContext.Provider>
    );
};