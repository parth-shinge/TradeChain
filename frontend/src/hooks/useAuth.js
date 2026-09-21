import { useWallet } from './useWallet';
import { useState } from 'react';
import axios from 'axios';

export function useAuth() {
  const { connect, disconnect } = useWallet();
  const [user, setUser] = useState(null);

  const login = async () => {
    const { address, signature, message } = await connect();
    const res = await axios.post('http://localhost:3001/api/auth/verify', { walletAddress: address, signature, message });
    setUser(res.data);
    localStorage.setItem('walletAddress', address);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post('http://localhost:3001/api/auth/register', data);
    setUser(res.data);
    localStorage.setItem('walletAddress', data.walletAddress);
    return res.data;
  };

  const logout = () => {
    disconnect();
    setUser(null);
  };

  const checkAuth = async () => {
    const address = localStorage.getItem('walletAddress');
    if (!address) return null;
    try {
      const res = await axios.get('http://localhost:3001/api/auth/me', {
        headers: { 'x-wallet-address': address }
      });
      setUser(res.data);
      return res.data;
    } catch (e) {
      logout();
      return null;
    }
  };

  return { user, setUser, login, register, logout, checkAuth };
}