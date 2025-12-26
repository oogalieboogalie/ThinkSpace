import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/Auth/LoginScreen';

interface AuthWrapperProps {
    children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        const isGuest = localStorage.getItem('guest_mode') === 'true';
        if (isGuest) {
            return <>{children}</>;
        }
        return <LoginScreen />;
    }

    return <>{children}</>;
};
