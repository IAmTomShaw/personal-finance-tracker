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

// Calendar / Recurring Transactions

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  recurrence: 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;    // 1-31 for monthly
  dayOfWeek?: number;     // 0-6 for weekly (Sun-Sat)
  monthOfYear?: number;   // 0-11 for yearly
  startDate: Date;
  endDate?: Date;
  category: string;
  color?: string;
  createdAt: Date;
}

export const CALENDAR_CATEGORIES = [
  'Salary',
  'Rent/Mortgage',
  'Utilities',
  'Subscriptions',
  'Insurance',
  'Loan Payment',
  'Other',
] as const;

export const CALENDAR_COLORS: Record<string, string> = {
  'Salary': '#16a34a',
  'Rent/Mortgage': '#dc2626',
  'Utilities': '#f59e0b',
  'Subscriptions': '#8b5cf6',
  'Insurance': '#0ea5e9',
  'Loan Payment': '#ef4444',
  'Other': '#6b7280',
} as const;
