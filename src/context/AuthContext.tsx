'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email?: string;
  telegramId?: string;
  googleId?: string;
  avatar?: string;
  walletAddress?: string;
  createdAt: Date;
}

interface GoogleAuthData {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  photo_url?: string;
}

type AuthData = GoogleAuthData | TelegramAuthData;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (provider: 'google' | 'telegram', data: AuthData) => Promise<void>;
  logout: () => void;
  connectWallet: (address: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // In a real app, you'd verify the token with your backend
          const userData = localStorage.getItem('user_data');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (provider: 'google' | 'telegram', data: AuthData) => {
    try {
      setIsLoading(true);
      
      let userData: User;
      
      if (provider === 'google') {
        const googleData = data as GoogleAuthData;
        userData = {
          id: googleData.id,
          name: googleData.name,
          email: googleData.email,
          googleId: googleData.id,
          avatar: googleData.picture,
          createdAt: new Date()
        };
      } else {
        const telegramData = data as TelegramAuthData;
        userData = {
          id: telegramData.id.toString(),
          name: `${telegramData.first_name} ${telegramData.last_name || ''}`.trim(),
          telegramId: telegramData.id.toString(),
          avatar: telegramData.photo_url,
          createdAt: new Date()
        };
      }

      // Store user data (in production, verify with backend/Turnkey first)
      // Generate a session token for local storage
      const sessionToken = crypto.randomUUID();
      localStorage.setItem('auth_token', sessionToken);
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const connectWallet = (address: string) => {
    if (user) {
      const updatedUser = { ...user, walletAddress: address };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    connectWallet
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

