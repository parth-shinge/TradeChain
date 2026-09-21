import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const address = localStorage.getItem('walletAddress');
  if (address) {
    config.headers['x-wallet-address'] = address;
  }
  return config;
});

export function useApi() {
  const navigate = useNavigate();
  
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('walletAddress');
        navigate('/');
      }
      return Promise.reject(error);
    }
  );

  return api;
}