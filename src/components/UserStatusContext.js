import React, { createContext, useState, useEffect } from "react";
import socket from './socket';

// Create the context
export const UserStatusContext = createContext();

// Create the provider
export const UserStatusProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(false);

    /**
     * Sync user's online status with the backend
     * Can be called on login or to ensure frontend aligns with backend state
     */
    const syncStatus = async () => {
        try {
            const response = await fetch('http://localhost:8000/sync-status', {
                method: 'GET',
                credentials: 'include', // Ensure cookies are sent
            });

            if (response.ok) {
                const data = await response.json();
                setIsOnline(data.isOnline); // Update local state

                if (data.isOnline && !socket.connected) {
                    socket.connect(); // Ensure socket is connected
                    console.log('Socket connected after syncing status:', socket.id);
                } else if (!data.isOnline && socket.connected) {
                    socket.disconnect(); // Disconnect socket if offline
                    console.log('Socket disconnected after syncing status');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error|| 'Login failed. Please try again.');
                // console.error('Failed to sync status from backend');
            }
        } catch (error) {
            console.error('Error syncing status:', error);
        }
    };

    /**
     * Toggle user's online status manually (via checkbox or UI toggle)
     */
    const toggleStatus = async () => {
        try {
            if (!isOnline) {
                socket.connect();
    
                // Wait for the socket to confirm connection
                socket.once('connect', async () => {
                    console.log('Socket connected:', socket.id);
    
                    const response = await fetch('http://localhost:8000/sync-status', {
                        method: 'GET',
                        credentials: 'include', // Ensures cookies are sent
                    });
    
                    if (response.ok) {
                        const data = await response.json();
                        setIsOnline(data.isOnline); // Ensure state matches backend
                        console.log('Online status synced:', data.isOnline);
                    } else {
                        console.error('Failed to sync status');
                    }
                });
            } else {
                socket.disconnect();
    
                // After disconnecting, fetch status immediately
                const response = await fetch('http://localhost:8000/sync-status', {
                    method: 'GET',
                    credentials: 'include', // Ensures cookies are sent
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setIsOnline(data.isOnline); // Ensure state matches backend
                    console.log('Offline status synced:', data.isOnline);
                } else {
                    console.error('Failed to sync status');
                }
            }
        } catch (error) {
            console.error('Error syncing status:', error);
        }
    };
    

    /**
     * Effect to handle socket cleanup when the component unmounts
     */
    useEffect(() => {
        return () => {
            if (socket.connected) {
                socket.disconnect();
                console.log('Socket disconnected on context unmount');
            }
        };
    }, []);

    return (
        <UserStatusContext.Provider value={{ isOnline, toggleStatus, syncStatus }}>
        {/* <UserStatusContext.Provider value={{ isOnline, toggleStatus }}> */}
            {children}
        </UserStatusContext.Provider>
    );
};