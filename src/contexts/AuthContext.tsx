
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's a user in local storage on initial load
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // In a real app, you would make an API call to verify credentials
    // For now, we'll simulate a successful login with mock data
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple validation
    if (!email.includes('@') || password.length < 6) {
      throw new Error("Invalid credentials");
    }

    const user = {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      email
    };
    
    // Store in local storage
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    // In a real app, you would make an API call to register the user
    // For now, we'll simulate a successful registration with mock data
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple validation
    if (!email.includes('@') || password.length < 6) {
      throw new Error("Invalid credentials");
    }

    const user = {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      name,
      email
    };
    
    // Store in local storage
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
