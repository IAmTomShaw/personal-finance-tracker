export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity';
  category: string;
  createdAt: Date;
}

export interface Balance {
  id: string;
  accountId: string;
  amount: number;
  date: Date;
}

export interface Transaction {
  id: string;
  accountId?: string;
  amount: number;
  date: Date;
  description: string;
  category: string;
  type: 'income' | 'expense';
}

export interface AccountWithBalance extends Account {
  currentBalance: number;
}

export interface AccountWithHistory extends Account {
  balanceHistory: { date: Date; amount: number }[];
}

export type AccountType = 'asset' | 'liability' | 'equity';

export interface ACCOUNT_CATEGORIES_TYPE {
  asset: string[];
  liability: string[];
  equity: string[];
}

export const ACCOUNT_CATEGORIES: ACCOUNT_CATEGORIES_TYPE = {
  asset: [
    'Cash and Cash Equivalents',
    'Investments',
    'Real Estate',
    'Personal Property',
    'Other Assets'
  ],
  liability: [
    'Credit Cards',
    'Loans',
    'Mortgages',
    'Other Liabilities'
  ],
  equity: [
    'Net Worth'
  ]
} as const;
