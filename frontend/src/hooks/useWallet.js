import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [address, setAddress] = useState('');
  
  useEffect(() => {
    const saved = localStorage.getItem('walletAddress');
    if (saved) setAddress(saved);
  }, []);

  const connect = async () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    const message = "Sign this message to authenticate with TradeChain.";
    const signature = await signer.signMessage(message);
    
    return { address, signature, message };
  };

  const disconnect = () => {
    setAddress('');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('token');
  };

  return { address, connect, disconnect };
}