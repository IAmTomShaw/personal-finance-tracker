'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Balance, AccountWithBalance, AccountWithHistory, Transaction } from '@/types/finance';
import { allowCloudSync, isCloudSyncAllowed } from '@/lib/offline';

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
    return accounts.map(account => {
      // Get the most recent balance for this account
      const accountBalances = balances
        .filter(balance => balance.accountId === account.id)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const currentBalance = accountBalances.length > 0 ? accountBalances[0].amount : 0;
      
      return {
        ...account,
        currentBalance,
      };
    });
    
  };

  const addTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: crypto.randomUUID(),
    };
    
    // Update local transaction state
    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);

    // If linked to an account, update its balance
    let updatedBalances = balances;
    if (transactionData.accountId) {
      const accountBalances = balances
        .filter(b => b.accountId === transactionData.accountId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const currentAmount = accountBalances.length > 0 ? accountBalances[0].amount : 0;
      const newAmount = roundCurrency(transactionData.type === 'income' 
        ? currentAmount + transactionData.amount 
        : currentAmount - transactionData.amount);

      const newBalance: Balance = {
        id: crypto.randomUUID(),
        accountId: transactionData.accountId,
        amount: newAmount,
        date: new Date(), // Always update 'current' balance state
      };

      updatedBalances = [...balances, newBalance];
      setBalances(updatedBalances);
    }
    
    if (isCloudSyncAllowed()) {
      saveUserCloudData(accounts, updatedBalances, updatedTransactions);
    }
  };

  const deleteTransaction = (transactionId: string) => {
    // specific transaction to delete
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    
    // remove from state
    const updatedTransactions = transactions.filter(t => t.id !== transactionId);
    setTransactions(updatedTransactions);

    // If linked to an account, revert balance
    let updatedBalances = balances;
    if (transactionToDelete && transactionToDelete.accountId) {
       const accountBalances = balances
        .filter(b => b.accountId === transactionToDelete.accountId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const currentAmount = accountBalances.length > 0 ? accountBalances[0].amount : 0;
      
      // Reverse logic: if it was income, subtract. If expense, add.
      const newAmount = roundCurrency(transactionToDelete.type === 'income'
        ? currentAmount - transactionToDelete.amount
        : currentAmount + transactionToDelete.amount);

      const newBalance: Balance = {
        id: crypto.randomUUID(),
        accountId: transactionToDelete.accountId,
        amount: newAmount,
        date: new Date(), // Revert timestamp is now
      };
      
      updatedBalances = [...balances, newBalance];
      setBalances(updatedBalances);
    }
      
    if (isCloudSyncAllowed()) {
      saveUserCloudData(accounts, updatedBalances, updatedTransactions);
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

    // Calculate balance updates
    let updatedBalances = [...balances];
    
    // We need to ensure timestamps are distinct and sequential so sorting is deterministic
    const now = new Date();
    const revertTime = new Date(now.getTime());
    const applyTime = new Date(now.getTime() + 10); // 10ms later to ensure it comes after

    // 1. Revert original transaction effect
    if (originalTransaction.accountId) {
      const accountBalances = updatedBalances
        .filter(b => b.accountId === originalTransaction.accountId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const currentAmount = accountBalances.length > 0 ? accountBalances[0].amount : 0;
      
      // Reverse logic: if it was income, subtract. If expense, add.
      const revertedAmount = roundCurrency(originalTransaction.type === 'income'
        ? currentAmount - originalTransaction.amount
        : currentAmount + originalTransaction.amount);

      const partialBalance: Balance = {
        id: crypto.randomUUID(),
        accountId: originalTransaction.accountId,
        amount: revertedAmount,
        date: revertTime, 
      };
      updatedBalances = [...updatedBalances, partialBalance];
    }

    // 2. Apply new transaction effect (if still linked to an account)
    // Note: We use the balances *after* reversion as the base
    if (updatedTransaction.accountId) {
      // If the account changed, we need to fetch the latest balance of the NEW account
      const accountBalances = updatedBalances
        .filter(b => b.accountId === updatedTransaction.accountId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const currentAmount = accountBalances.length > 0 ? accountBalances[0].amount : 0;
      
      const newAmount = roundCurrency(updatedTransaction.type === 'income'
        ? currentAmount + updatedTransaction.amount
        : currentAmount - updatedTransaction.amount);

      const finalBalance: Balance = {
        id: crypto.randomUUID(),
        accountId: updatedTransaction.accountId,
        amount: newAmount,
        date: applyTime,
      };
      
      updatedBalances = [...updatedBalances, finalBalance];
    }
    
    setBalances(updatedBalances);

    if (isCloudSyncAllowed()) {
      saveUserCloudData(accounts, updatedBalances, updatedTransactions);
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
      
      // Validate the data structure
      if (!data.accounts || !data.balances || !Array.isArray(data.accounts) || !Array.isArray(data.balances)) {
        console.error('Invalid data format: missing accounts or balances arrays');
        return false;
      }

      // Validate accounts structure
      for (const account of data.accounts) {
        if (!account.id || !account.name || !account.type || !account.category) {
          console.error('Invalid account structure:', account);
          return false;
        }
      }

      // Validate balances structure
      for (const balance of data.balances) {
        if (!balance.id || !balance.accountId || typeof balance.amount !== 'number' || !balance.date) {
          console.error('Invalid balance structure:', balance);
          return false;
        }
      }

      // Convert date strings back to Date objects
      const importedAccounts = data.accounts.map((acc: Partial<Account> & { createdAt: string }) => ({
        ...acc,
        createdAt: new Date(acc.createdAt)
      }));

      const importedBalances = data.balances.map((bal: Partial<Balance> & { date: string }) => ({
        ...bal,
        date: new Date(bal.date)
      }));

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
