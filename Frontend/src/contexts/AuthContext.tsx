import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type UserRole = 'user' | 'admin' | null;

interface User {
  email: string;
  role: UserRole;
  name: string;
  location: string;
  phone: string;
  vehicleNumber?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole, location: string, phone: string, vehicleNumber?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('traffic_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // Map backend role to frontend role (handle 'public' -> 'user')
        const mappedRole: UserRole = data.user.role === 'admin' ? 'admin' : 'user';

        // Verify that the authenticated user's role matches the selected role
        if (role && mappedRole !== role) {
          return false;
        }

        const newUser: User = {
          email: data.user.email,
          role: mappedRole,
          name: data.user.name,
          location: data.user.location,
          phone: data.user.phone,
          vehicleNumber: data.user.vehicleNumber,
        };

        setUser(newUser);
        localStorage.setItem('traffic_user', JSON.stringify(newUser));
        localStorage.setItem('traffic_token', data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login request failed:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole, location: string, phone: string, vehicleNumber?: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role: role === 'admin' ? 'admin' : 'public', location, phone, vehicleNumber }),
      });

      return response.ok;
    } catch (error) {
      console.error('Registration request failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('traffic_user');
    localStorage.removeItem('traffic_token');
  }, []);

  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem('traffic_user', JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
