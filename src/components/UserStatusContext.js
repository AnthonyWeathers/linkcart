import React, { createContext, useState } from "react";

// Create the context
export const UserStatusContext = createContext();

// Create the provider
export const UserStatusProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(false);

    const toggleStatus = () => {
        setIsOnline((prev) => !prev);
    };

    return (
        <UserStatusContext.Provider value={{ isOnline, setIsOnline, toggleStatus }}>
            {children}
        </UserStatusContext.Provider>
    );
};