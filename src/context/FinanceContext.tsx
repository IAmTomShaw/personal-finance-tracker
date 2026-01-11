'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Balance, AccountWithBalance, AccountWithHistory, Transaction } from '@/types/finance';
import { allowCloudSync, isCloudSyncAllowed } from '@/lib/offline';
import { computeCurrentBalance } from '@/lib/balance-history';

interface FinanceContextType {
  accounts: Account[];
  balances: Balance[];
  transactions: Transaction[];
  isLoading: boolean;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateBalance: (accountId: string, amount: number) => void;
  updateMultipleBalances: (updates: { accountId: string; amount: number }[], date?: Date, replaceExisting?: boolean) => void;
  getAccountsWithBalances: () => AccountWithBalance[];
  getAccountsWithHistory: () => AccountWithHistory[];
  deleteAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Pick<Account, 'name' | 'category' | 'type'>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (transactionId: string) => void;
  updateTransaction: (transactionId: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;
  triggerCloudSync: () => Promise<void>;
  triggerRemoveCloudData: () => Promise<void>;
}

const roundCurrency = (amount: number) => {
  return Math.round(amount * 100) / 100;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from API on mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('finance-accounts');
    const savedBalances = localStorage.getItem('finance-balances');
    const savedTransactions = localStorage.getItem('finance-transactions');

     if (savedAccounts) {
      const parsedAccounts = JSON.parse(savedAccounts);
      setAccounts(parsedAccounts.map((acc: Account) => ({
        ...acc,
        createdAt: new Date(acc.createdAt)
      })));
    }
    if (savedBalances) {
      const parsedBalances = JSON.parse(savedBalances);
      setBalances(parsedBalances.map((bal: Balance) => ({
        ...bal,
        date: new Date(bal.date)
      })));
    }
    if (savedTransactions) {
      const parsedTransactions = JSON.parse(savedTransactions);
      setTransactions(parsedTransactions.map((tx: Transaction) => ({
        ...tx,
        date: new Date(tx.date)
      })));
    }

    if (!isCloudSyncAllowed()) {
      setIsLoading(false);
      return;
    }
    getUserCloudData()
        .then((res: { accounts: Account[]; balances: Balance[]; transactions?: Transaction[] } | null) => {

          if (res === null) {
            allowCloudSync(false);
          } else {
            setAccounts(res.accounts);
            setBalances(res.balances.map(b => ({ ...b, date: new Date(b.date) })));
            if (res.transactions) {
              setTransactions(res.transactions.map(t => ({ ...t, date: new Date(t.date) })));
              localStorage.setItem('finance-transactions', JSON.stringify(res.transactions));
            }

            localStorage.setItem('finance-accounts', JSON.stringify(res.accounts));
            localStorage.setItem('finance-balances', JSON.stringify(res.balances));
            allowCloudSync(true);
          }
        })
        .catch((error) => {
          console.error('Error fetching user cloud data:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
  }, []);

  const getUserCloudData = async (): Promise<{ accounts: Account[]; balances: Balance[]; transactions?: Transaction[] } | null> => {
    console.warn('Fetching user cloud data from API');
    const response = await fetch('/api/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data;
  }

  const saveUserCloudData = async (accounts: Account[], balances: Balance[], transactions: Transaction[]) => {
    console.warn('Saving user cloud data to API');
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accounts, balances, transactions }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save user cloud data');
    }

    return;
  }

  const deleteUserCloudData = async (): Promise<void> => {
    console.warn('Deleting user cloud data from API');
    const response = await fetch('/api/data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete user cloud data');
    }

    return;
  }

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('finance-accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('finance-balances', JSON.stringify(balances));
  }, [balances]);

  useEffect(() => {
    localStorage.setItem('finance-transactions', JSON.stringify(transactions));
  }, [transactions]);

  const triggerCloudSync = () => {
    return saveUserCloudData(accounts, balances, transactions);
  }

  const triggerRemoveCloudData = () => {
    return deleteUserCloudData();
  }

  const addAccount = (accountData: Omit<Account, 'id' | 'createdAt'>) => {

    // If the user is using the API version, create account via API

    const newAccount: Account = {
      ...accountData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setAccounts(prev => [...prev, newAccount]);

    if (isCloudSyncAllowed()) {
      return saveUserCloudData([...accounts, newAccount], balances, transactions);
    }

  };

  const updateBalance = (accountId: string, amount: number) => {

    const newBalance: Balance = {
      id: crypto.randomUUID(),
      accountId,
      amount: roundCurrency(amount),
      date: new Date(),
    };
    setBalances(prev => [...prev, newBalance]);

    if (isCloudSyncAllowed()) {
      return saveUserCloudData(accounts, [...balances, newBalance], transactions);
    }
  };

  const updateAccount = (accountId: string, updates: Pick<Account, 'name' | 'category' | 'type'>) => {
    setAccounts(prev => {
      const updatedAccounts = prev.map(account =>
        account.id === accountId ? { ...account, ...updates } : account
      );

      if (isCloudSyncAllowed()) {
        saveUserCloudData(updatedAccounts, balances, transactions);
      }

      return updatedAccounts;
    });
  };

  const updateMultipleBalances = (
    updates: { accountId: string; amount: number }[],
    date?: Date,
    replaceExisting: boolean = false
  ) => {
    const balanceDate = date || new Date();
    const targetDateString = balanceDate.toISOString().split('T')[0];

    const newBalances = updates.map(update => ({
      id: crypto.randomUUID(),
      accountId: update.accountId,
      amount: roundCurrency(update.amount),
      date: balanceDate,
    }));

    setBalances(prev => {
      const filteredPrev = replaceExisting
        ? prev.filter(balance => balance.date.toISOString().split('T')[0] !== targetDateString)
        : prev;

      const updatedBalances = [...filteredPrev, ...newBalances];

      if (isCloudSyncAllowed()) {
        saveUserCloudData(accounts, updatedBalances, transactions);
      }

      return updatedBalances;
    });
  };

  const getAccountsWithBalances = (): AccountWithBalance[] => {
    return accounts.map(account => ({
      ...account,
      currentBalance: computeCurrentBalance(account.id, balances, transactions),
    }));
    
  };

  const addTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: crypto.randomUUID(),
    };
    
    // Update local transaction state
    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    
    if (isCloudSyncAllowed()) {
      saveUserCloudData(accounts, balances, updatedTransactions);
    }
  };

  const deleteTransaction = (transactionId: string) => {
    // remove from state
    const updatedTransactions = transactions.filter(t => t.id !== transactionId);
    setTransactions(updatedTransactions);
      
    if (isCloudSyncAllowed()) {
      saveUserCloudData(accounts, balances, updatedTransactions);
    }
  };

  const updateTransaction = (transactionId: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    // Find original transaction
    const originalTransaction = transactions.find(t => t.id === transactionId);
    if (!originalTransaction) return;

    const updatedTransaction = { ...originalTransaction, ...updates };

    // Update local transaction state
    const updatedTransactions = transactions.map(t => 
      t.id === transactionId ? updatedTransaction : t
    );
    setTransactions(updatedTransactions);
    if (isCloudSyncAllowed()) {
      saveUserCloudData(accounts, balances, updatedTransactions);
    }
  };

  const deleteAccount = (accountId: string) => {
    setAccounts(prev => prev.filter(account => account.id !== accountId));
    setBalances(prev => prev.filter(balance => balance.accountId !== accountId));

    if (isCloudSyncAllowed()) {
      return deleteUserCloudData();
    }
  };

  const exportData = (): string => {
    const exportPayload = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      accountsExportData: accounts,
      balancesExportData: balances,
      transactionsExportData: transactions,
    };
    return JSON.stringify(exportPayload, null, 2);
  };

  const importData = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);

      // Support both legacy format ({ accounts, balances, transactions }) and
      // current export format ({ accountsExportData, balancesExportData, transactionsExportData }).
      const rawAccounts = data.accounts ?? data.accountsExportData;
      const rawBalances = data.balances ?? data.balancesExportData;
      
      // Validate the data structure
      if (!rawAccounts || !rawBalances || !Array.isArray(rawAccounts) || !Array.isArray(rawBalances)) {
        console.error('Invalid data format: missing accounts or balances arrays');
        return false;
      }

      const isAccountImport = (
        value: unknown
      ): value is Omit<Account, 'createdAt'> & { createdAt?: string | Date } => {
        if (typeof value !== 'object' || value === null) return false;
        const acc = value as Record<string, unknown>;

        return (
          typeof acc.id === 'string' &&
          typeof acc.name === 'string' &&
          (acc.type === 'asset' || acc.type === 'liability' || acc.type === 'equity') &&
          typeof acc.category === 'string'
        );
      };

      const isBalanceImport = (
        value: unknown
      ): value is Omit<Balance, 'date'> & { date: string | Date } => {
        if (typeof value !== 'object' || value === null) return false;
        const bal = value as Record<string, unknown>;

        return (
          typeof bal.id === 'string' &&
          typeof bal.accountId === 'string' &&
          typeof bal.amount === 'number' &&
          (typeof bal.date === 'string' || bal.date instanceof Date)
        );
      };

      const importedAccounts: Account[] = rawAccounts
        .filter(isAccountImport)
        .map((acc) => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          category: acc.category,
          createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date(),
        }));

      const importedBalances: Balance[] = rawBalances
        .filter(isBalanceImport)
        .map((bal) => ({
          id: bal.id,
          accountId: bal.accountId,
          amount: bal.amount,
          date: new Date(bal.date),
        }));

      if (importedAccounts.length !== rawAccounts.length) {
        console.error('Invalid account structure in import file');
        return false;
      }

      if (importedBalances.length !== rawBalances.length) {
        console.error('Invalid balance structure in import file');
        return false;
      }

      // Handle transactions import (optional for backward compatibility)
      let importedTransactions: Transaction[] = [];
      if (data.transactions || data.transactionsExportData) {
        const rawTransactions = data.transactions || data.transactionsExportData;
        if (Array.isArray(rawTransactions)) {
          const isTransactionImport = (
            value: unknown
          ): value is Omit<Transaction, 'date'> & { date: string } => {
            if (typeof value !== 'object' || value === null) return false;
            const tx = value as Record<string, unknown>;

            return (
              typeof tx.id === 'string' &&
              (tx.accountId === undefined || typeof tx.accountId === 'string') &&
              typeof tx.amount === 'number' &&
              typeof tx.date === 'string' &&
              typeof tx.description === 'string' &&
              typeof tx.category === 'string' &&
              (tx.type === 'income' || tx.type === 'expense')
            );
          };

          importedTransactions = rawTransactions
            .filter(isTransactionImport)
            .map((tx) => ({
              ...tx,
              date: new Date(tx.date),
            }));
        }
      }

      // Replace current data
      setAccounts(importedAccounts);
      setBalances(importedBalances);
      setTransactions(importedTransactions);

      if (isCloudSyncAllowed()) {

        saveUserCloudData(importedAccounts, importedBalances, importedTransactions);
        
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  };

  const clearAllData = () => {
    setAccounts([]);
    setBalances([]);
    setTransactions([]);
    localStorage.removeItem('finance-accounts');
    localStorage.removeItem('finance-balances');
    localStorage.removeItem('finance-transactions');
  };

  const getAccountsWithHistory = (): AccountWithHistory[] => {
    return accounts.map(account => {
      // Get balances for this account within the date range
      const accountBalances = balances
        .filter(balance => 
          balance.accountId === account.id
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime());
        
      return {
        ...account,
        balanceHistory: accountBalances,
      };
    });
  }

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        balances,
        transactions,
        isLoading,
        addAccount,
        updateBalance,
        updateMultipleBalances,
        getAccountsWithBalances,
        updateAccount,
        deleteAccount,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        exportData,
        importData,
        clearAllData,
        triggerCloudSync,
        triggerRemoveCloudData,
        getAccountsWithHistory,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
