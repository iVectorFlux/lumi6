import { jwtDecode } from 'jwt-decode';

// Type definitions
export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  exp: number;
}

// Authentication configuration
export const authConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  tokenKey: 'token',
  
  // Get the token from localStorage
  getToken: (): string | null => {
    return localStorage.getItem(authConfig.tokenKey);
  },
  
  // Store the token in localStorage
  setToken: (token: string): void => {
    localStorage.setItem(authConfig.tokenKey, token);
  },
  
  // Remove the token from localStorage
  removeToken: (): void => {
    localStorage.removeItem(authConfig.tokenKey);
  },
  
  // Check if a user is logged in
  isAuthenticated: (): boolean => {
    const token = authConfig.getToken();
    if (!token) return false;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      authConfig.removeToken();
      return false;
    }
  },
  
  // Get the user's role from the token
  getUserRole: (): string | null => {
    const token = authConfig.getToken();
    if (!token) return null;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.role;
    } catch (error) {
      return null;
    }
  },
  
  // Get the user's company ID from the token
  getCompanyId: (): string | null => {
    const token = authConfig.getToken();
    if (!token) return null;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.companyId || null;
    } catch (error) {
      return null;
    }
  },
  
  // Check if the user has a specific role
  hasRole: (role: string): boolean => {
    const userRole = authConfig.getUserRole();
    return userRole === role;
  },
  
  // Get the user's name from the token
  getUserName: (): string | null => {
    const token = authConfig.getToken();
    if (!token) return null;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.name || null;
    } catch (error) {
      return null;
    }
  },

  // Get authentication headers for API requests
  getAuthHeaders: () => {
    const token = authConfig.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

export default authConfig; 