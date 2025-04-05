import React, { createContext, useContext, ReactNode, useState } from 'react';
import Match from '@/types/matchType';

// Define a type for the context that includes both state and setter functions
type AppContextType = {
  customHeader: boolean;
  setCustomHeader: (value: boolean) => void;
  activeChat: Match | null;
  setActiveChat: (match: Match | null) => void;
};

// Create the context with an undefined default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Define the provider props type
type AppProviderProps = {
  children: ReactNode;
};

// Create the provider component that wraps your app
export const AppProvider = ({ children }: AppProviderProps) => {
  // Create state and setter functions
  const [customHeader, setCustomHeader] = useState<boolean>(false);
  const [activeChat, setActiveChat] = useState<Match | null>(null);
  
  // Include both state and setters in the context value
  const contextValue: AppContextType = {
    customHeader,
    setCustomHeader,
    activeChat,
    setActiveChat
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for easy access to the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};