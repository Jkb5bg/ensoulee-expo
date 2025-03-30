import React, { createContext, useContext, useState, ReactNode } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

// Create the loading context
type LoadingContextType = {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Provider props type
interface LoadingProviderProps {
  children: ReactNode;
}

// Provider component
export const LoadingProvider = ({ children }: LoadingProviderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('Loading...');

  // Show the loading overlay
  const showLoading = (customMessage?: string) => {
    console.log('Showing global loading overlay');
    if (customMessage) {
      setMessage(customMessage);
    }
    setIsVisible(true);
  };

  // Hide the loading overlay
  const hideLoading = () => {
    console.log('Hiding global loading overlay');
    setIsVisible(false);
    setMessage('Loading...');
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: isVisible }}>
      {children}
      {isVisible && <LoadingScreen/>}
    </LoadingContext.Provider>
  );
};

// Custom hook to use the loading context
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};