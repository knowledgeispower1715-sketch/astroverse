/**
 * AstroVerse Mobile OS - Wallet & Transactions Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  timestamp: string;
}

interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
  recharge: (amount: number) => Promise<{ success: boolean; error?: string }>;
  deduct: (amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  unlockPaywall: (amount: number, featureName: string) => Promise<{ success: boolean; error?: string }>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  balance: 100, // Default promotional starting balance for guest/native exploration
  transactions: [],
  isLoading: false,
  recharge: async () => ({ success: false }),
  deduct: async () => ({ success: false }),
  unlockPaywall: async () => ({ success: false }),
  refreshBalance: async () => {}
});

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number>(100);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([
    {
      id: 'tx-welcome-bonus',
      type: 'CREDIT',
      amount: 100,
      description: 'Welcome Vedic Exploration Credit',
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshBalance = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get<any>('/api/wallet/balance');
      if (res.data?.success && typeof res.data.balance === 'number') {
        setBalance(res.data.balance);
      }
    } catch {
      // Keep local state
    }
  };

  useEffect(() => {
    if (user?.walletBalance !== undefined) {
      setBalance(user.walletBalance);
    }
  }, [user]);

  const recharge = async (amount: number) => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const res = await apiClient.post<any>('/api/wallet/recharge', { amount });
        if (res.data?.success) {
          setBalance(res.data.newBalance || balance + amount);
          setTransactions(prev => [
            {
              id: `tx-${Date.now()}`,
              type: 'CREDIT',
              amount,
              description: 'Wallet Recharge',
              timestamp: new Date().toISOString()
            },
            ...prev
          ]);
          return { success: true };
        }
      }

      // Offline simulation
      setBalance(prev => prev + amount);
      setTransactions(prev => [
        {
          id: `tx-${Date.now()}`,
          type: 'CREDIT',
          amount,
          description: 'Wallet Top-up',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const deduct = async (amount: number, reason: string) => {
    if (balance < amount) {
      return { success: false, error: 'Insufficient wallet balance. Please recharge.' };
    }

    if (isAuthenticated) {
      try {
        const res = await apiClient.post<any>('/api/wallet/deduct', { amount, reason });
        if (res.data?.success) {
          setBalance(res.data.newBalance);
          setTransactions(prev => [
            {
              id: `tx-${Date.now()}`,
              type: 'DEBIT',
              amount,
              description: reason,
              timestamp: new Date().toISOString()
            },
            ...prev
          ]);
          return { success: true };
        }
      } catch {
        // Fall back to local deduction
      }
    }

    setBalance(prev => Math.max(0, prev - amount));
    setTransactions(prev => [
      {
        id: `tx-${Date.now()}`,
        type: 'DEBIT',
        amount,
        description: reason,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
    return { success: true };
  };

  const unlockPaywall = async (amount: number, featureName: string) => {
    return await deduct(amount, `Unlocked ${featureName}`);
  };

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        isLoading,
        recharge,
        deduct,
        unlockPaywall,
        refreshBalance
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
