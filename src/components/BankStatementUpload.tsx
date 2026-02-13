'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency } from '@/context/CurrencyContext';

const MAX_PREVIEW_ROWS = 8;

type DateFormat = 'auto' | 'mdy' | 'dmy' | 'ymd';
type StatementType = 'balance' | 'transactions';

type NormalizedRow = {
  rowIndex: number;
  rawDate: string;
  rawValue: string;
  dateIso: string | null;
  amount: number | null;
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = text[i + 1];
        if (nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
};

const normalizeHeader = (value: string) => value.trim().toLowerCase();

const toIsoDate = (year: number, month: number, day: number) => {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() + 1 !== month ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }
  return utcDate.toISOString().split('T')[0];
};

const parseDateFromParts = (parts: string[], format: DateFormat): string | null => {
  if (parts.length !== 3) return null;
  const [part1, part2, part3] = parts.map((part) => part.trim());

  if (!part1 || !part2 || !part3) return null;

  if (format === 'ymd' && part1.length === 4) {
    return toIsoDate(Number(part1), Number(part2), Number(part3));
  }

  if ((format === 'mdy' || format === 'dmy') && part3.length === 4) {
    const month = format === 'mdy' ? Number(part1) : Number(part2);
    const day = format === 'mdy' ? Number(part2) : Number(part1);
    return toIsoDate(Number(part3), month, day);
  }

  if (format === 'auto') {
    if (part1.length === 4) {
      return toIsoDate(Number(part1), Number(part2), Number(part3));
    }

    if (part3.length === 4) {
      const first = Number(part1);
      const second = Number(part2);
      if (first > 12 && second <= 12) {
        return toIsoDate(Number(part3), second, first);
      }
      return toIsoDate(Number(part3), first, second);
    }
  }

  return null;
};

const normalizeDate = (raw: string, format: DateFormat): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (isoMatch) {
    return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const numericMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (numericMatch) {
    return parseDateFromParts([numericMatch[1], numericMatch[2], numericMatch[3]], format);
  }

  const altSeparators = trimmed.split('.');
  if (altSeparators.length === 3) {
    const normalized = parseDateFromParts(altSeparators, format);
    if (normalized) return normalized;
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return toIsoDate(
      fallback.getFullYear(),
      fallback.getMonth() + 1,
      fallback.getDate()
    );
  }

  return null;
};

const parseAmount = (raw: string): number | null => {
  let cleaned = raw.trim();
  if (!cleaned) return null;

  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }

  cleaned = cleaned.replace(/[$,\s]/g, '');

  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1);
  }

  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return null;

  return isNegative ? -Math.abs(value) : value;
};

const detectColumnIndex = (labels: string[], matchers: string[]) => {
  const normalized = labels.map(normalizeHeader);
  return normalized.findIndex((label) => matchers.some((matcher) => label.includes(matcher)));
};

export const BankStatementUpload: React.FC = () => {
  const { accounts, balances, importBalances } = useFinance();
  const { formatCurrency } = useCurrency();
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [dateColumnIndex, setDateColumnIndex] = useState(-1);
  const [balanceColumnIndex, setBalanceColumnIndex] = useState(-1);
  const [amountColumnIndex, setAmountColumnIndex] = useState(-1);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateFormat, setDateFormat] = useState<DateFormat>('auto');
  const [statementType, setStatementType] = useState<StatementType>('balance');
  const [startingBalanceInput, setStartingBalanceInput] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const valueLabel = statementType === 'balance' ? 'Balance' : 'Amount';

  const maxColumns = useMemo(() => {
    return rawRows.reduce((max, row) => Math.max(max, row.length), 0);
  }, [rawRows]);

  const columnLabels = useMemo(() => {
    if (maxColumns === 0) return [];
    const headerRow = hasHeaderRow && rawRows.length > 0 ? rawRows[0] : [];
    return Array.from({ length: maxColumns }, (_, index) => {
      const header = headerRow[index]?.trim();
      return header ? header : `Column ${index + 1}`;
    });
  }, [hasHeaderRow, rawRows, maxColumns]);

  const dataRows = useMemo(() => {
    if (rawRows.length === 0) return [];
    return hasHeaderRow ? rawRows.slice(1) : rawRows;
  }, [rawRows, hasHeaderRow]);

  useEffect(() => {
    if (columnLabels.length === 0) {
      setDateColumnIndex(-1);
      setBalanceColumnIndex(-1);
      setAmountColumnIndex(-1);
      return;
    }

    setDateColumnIndex((prev) => {
      if (prev >= 0 && prev < columnLabels.length) return prev;
      const detected = detectColumnIndex(columnLabels, [
        'date',
        'posting',
        'transaction date',
      ]);
      return detected >= 0 ? detected : 0;
    });

    if (statementType === 'balance') {
      setBalanceColumnIndex((prev) => {
        if (prev >= 0 && prev < columnLabels.length) return prev;
        const detected = detectColumnIndex(columnLabels, [
          'balance',
          'ending balance',
          'closing balance',
          'running balance',
        ]);
        return detected >= 0 ? detected : Math.min(1, columnLabels.length - 1);
      });
      return;
    }

    setAmountColumnIndex((prev) => {
      if (prev >= 0 && prev < columnLabels.length) return prev;
      const detected = detectColumnIndex(columnLabels, [
        'amount',
        'transaction',
        'debit',
        'credit',
        'withdrawal',
        'deposit',
      ]);
      return detected >= 0 ? detected : Math.min(1, columnLabels.length - 1);
    });
  }, [columnLabels, statementType]);

  const valueColumnIndex = statementType === 'balance' ? balanceColumnIndex : amountColumnIndex;

  const normalizedRows = useMemo<NormalizedRow[]>(() => {
    if (dateColumnIndex < 0 || valueColumnIndex < 0) return [];
    return dataRows.map((row, index) => {
      const rawDate = row[dateColumnIndex] ?? '';
      const rawValue = row[valueColumnIndex] ?? '';
      const dateIso = normalizeDate(rawDate, dateFormat);
      const amount = parseAmount(rawValue);
      return {
        rowIndex: hasHeaderRow ? index + 2 : index + 1,
        rawDate,
        rawValue,
        dateIso,
        amount,
      };
    });
  }, [dataRows, dateColumnIndex, valueColumnIndex, dateFormat, hasHeaderRow]);

  const validRows = useMemo(() => {
    return normalizedRows.filter((row) => row.dateIso && row.amount !== null);
  }, [normalizedRows]);

  const dedupedRows = useMemo(() => {
    if (statementType === 'balance') {
      const map = new Map<string, NormalizedRow>();
      let duplicateCount = 0;
      validRows.forEach((row) => {
        if (!row.dateIso) return;
        if (map.has(row.dateIso)) {
          duplicateCount += 1;
        }
        map.set(row.dateIso, row);
      });

      return {
        rows: Array.from(map.values()).sort((a, b) => {
          if (!a.dateIso || !b.dateIso) return 0;
          return a.dateIso.localeCompare(b.dateIso);
        }),
        duplicateCount,
      };
    }

    const map = new Map<string, { dateIso: string; amount: number }>();
    let duplicateCount = 0;
    validRows.forEach((row) => {
      if (!row.dateIso || row.amount === null) return;
      if (map.has(row.dateIso)) {
        duplicateCount += 1;
      }
      map.set(row.dateIso, {
        dateIso: row.dateIso,
        amount: (map.get(row.dateIso)?.amount ?? 0) + row.amount,
      });
    });

    return {
      rows: Array.from(map.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso)),
      duplicateCount,
    };
  }, [validRows, statementType]);

  const startingBalance = useMemo(
    () => (statementType === 'transactions' ? parseAmount(startingBalanceInput) : null),
    [startingBalanceInput, statementType]
  );

  const importEntries = useMemo(() => {
    if (!selectedAccountId) return [];
    if (statementType === 'balance') {
      return dedupedRows.rows.map((row) => ({
        accountId: selectedAccountId,
        amount: row.amount ?? 0,
        date: new Date(row.dateIso ?? ''),
      }));
    }

    if (startingBalance === null) return [];

    let runningBalance = startingBalance;
    return dedupedRows.rows.map((row) => {
      runningBalance += row.amount ?? 0;
      return {
        accountId: selectedAccountId,
        amount: runningBalance,
        date: new Date(row.dateIso ?? ''),
      };
    });
  }, [dedupedRows.rows, selectedAccountId, startingBalance, statementType]);

  const existingDateMatches = useMemo(() => {
    if (!selectedAccountId || balances.length === 0) return 0;
    const existingDates = new Set(
      balances
        .filter((balance) => balance.accountId === selectedAccountId)
        .map((balance) => balance.date.toISOString().split('T')[0])
    );
    return importEntries.filter((entry) =>
      existingDates.has(entry.date.toISOString().split('T')[0])
    ).length;
  }, [balances, importEntries, selectedAccountId]);

  const summary = useMemo(() => {
    if (normalizedRows.length === 0) return null;
    const skippedRows = normalizedRows.length - validRows.length;
    const uniqueDays = dedupedRows.rows.length;
    const dateRange = dedupedRows.rows.length
      ? {
        start: dedupedRows.rows[0].dateIso,
        end: dedupedRows.rows[dedupedRows.rows.length - 1].dateIso,
      }
      : null;

    return {
      totalRows: normalizedRows.length,
      validRows: validRows.length,
      skippedRows,
      uniqueDays,
      duplicateCount: dedupedRows.duplicateCount,
      dateRange,
    };
  }, [normalizedRows, validRows, dedupedRows]);

  const hasValidStartingBalance = statementType === 'balance' || startingBalance !== null;

  const canImport =
    selectedAccountId &&
    fileName &&
    dateColumnIndex >= 0 &&
    valueColumnIndex >= 0 &&
    importEntries.length > 0 &&
    hasValidStartingBalance &&
    !isImporting;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setStatusMessage('');
    setErrorMessage('');

    if (!file) {
      setFileName('');
      setRawRows([]);
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setErrorMessage('No rows found. Please check the CSV formatting.');
        setRawRows([]);
        setFileName(file.name);
        return;
      }
      setRawRows(rows);
      setFileName(file.name);
      setDateColumnIndex(-1);
      setBalanceColumnIndex(-1);
      setAmountColumnIndex(-1);
    } catch (error) {
      console.error('Error reading CSV file:', error);
      setErrorMessage('Unable to read this file. Please try a different CSV.');
      setRawRows([]);
      setFileName(file.name);
    }
  };

  const handleImport = () => {
    if (!canImport) return;

    setIsImporting(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      importBalances(importEntries, replaceExisting);
      setStatusMessage(
        `Imported ${importEntries.length} daily balance${importEntries.length === 1 ? '' : 's'} for ${accounts.find((account) => account.id === selectedAccountId)?.name ?? 'selected account'
        }.`
      );
    } catch (error) {
      console.error('Error importing balances:', error);
      setErrorMessage('Something went wrong while importing. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-neutral-400 text-lg mb-4">No accounts available</div>
        <p className="text-gray-400 dark:text-neutral-500">Create an account first, then upload your bank statement CSV.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg dark:shadow-neutral-900/50 p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Bank Statement Import</h1>
          <p className="text-gray-600 dark:text-neutral-400">
            Import daily balances from a CSV or calculate them from money in/out transactions.
          </p>
        </div>

        <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          CSV processing happens entirely in your browser. Your file is not uploaded to a server.
        </div>

        {statusMessage && (
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Assign to Account
            </label>
            <select
              id="account-select"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
              Make sure this matches the account shown on your bank statement.
            </p>
          </div>

          <div>
            <label htmlFor="statement-type" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Statement Type
            </label>
            <select
              id="statement-type"
              value={statementType}
              onChange={(event) => setStatementType(event.target.value as StatementType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
            >
              <option value="balance">Balance statements</option>
              <option value="transactions">Money in/out statements</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
              Choose how balances should be derived from the CSV.
            </p>
          </div>

          <div>
            <label htmlFor="statement-upload" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              CSV Bank Statement
            </label>
            <input
              id="statement-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-700 dark:text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {fileName && (
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">Selected file: {fileName}</p>
            )}
          </div>
        </div>

        {columnLabels.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Date Column</label>
                <select
                  value={dateColumnIndex}
                  onChange={(event) => setDateColumnIndex(Number(event.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
                >
                  {columnLabels.map((label, index) => (
                    <option key={label + index} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  {statementType === 'balance' ? 'Balance Column' : 'Amount Column'}
                </label>
                <select
                  value={valueColumnIndex}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (statementType === 'balance') {
                      setBalanceColumnIndex(nextValue);
                    } else {
                      setAmountColumnIndex(nextValue);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
                >
                  {columnLabels.map((label, index) => (
                    <option key={label + index} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(event) => setDateFormat(event.target.value as DateFormat)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
                >
                  <option value="auto">Auto (US M/D/Y)</option>
                  <option value="mdy">M/D/YYYY</option>
                  <option value="dmy">D/M/YYYY</option>
                  <option value="ymd">YYYY-M-D</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={hasHeaderRow}
                onChange={(event) => setHasHeaderRow(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              First row contains column headers
            </label>
          </div>
        )}

        {statementType === 'transactions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="starting-balance" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Starting Balance
              </label>
              <input
                id="starting-balance"
                type="text"
                inputMode="decimal"
                value={startingBalanceInput}
                onChange={(event) => setStartingBalanceInput(event.target.value)}
                placeholder="e.g., 1500.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">
                Enter the balance at the start of the first statement day.
              </p>
              {statementType === 'transactions' && startingBalanceInput && startingBalance === null && (
                <p className="text-xs text-red-500 mt-1">Enter a valid starting balance.</p>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700/50 px-4 py-3">
                <div className="text-xs uppercase text-gray-500 dark:text-neutral-400">
                  {statementType === 'transactions' ? 'Transactions' : 'Rows'}
                </div>
                <div className="text-lg font-semibold text-gray-800 dark:text-neutral-100">{summary.totalRows}</div>
              </div>
              <div className="rounded-lg border dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700/50 px-4 py-3">
                <div className="text-xs uppercase text-gray-500 dark:text-neutral-400">
                  {statementType === 'transactions' ? 'Valid Txns' : 'Valid Rows'}
                </div>
                <div className="text-lg font-semibold text-gray-800 dark:text-neutral-100">{summary.validRows}</div>
              </div>
              <div className="rounded-lg border dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700/50 px-4 py-3">
                <div className="text-xs uppercase text-gray-500 dark:text-neutral-400">Unique Days</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-neutral-100">{summary.uniqueDays}</div>
              </div>
              <div className="rounded-lg border dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700/50 px-4 py-3">
                <div className="text-xs uppercase text-gray-500 dark:text-neutral-400">Skipped</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-neutral-100">{summary.skippedRows}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-neutral-400">
              {summary.dateRange ? (
                <span>
                  Date range: {summary.dateRange.start} through {summary.dateRange.end}
                </span>
              ) : (
                <span>No valid dates detected yet.</span>
              )}
              {summary.duplicateCount > 0 && (
                <span className="ml-2 text-amber-600">
                  {statementType === 'balance'
                    ? `${summary.duplicateCount} duplicate date${summary.duplicateCount === 1 ? '' : 's'
                    } found. The last row per day will be used.`
                    : `${summary.duplicateCount} additional transaction${summary.duplicateCount === 1 ? '' : 's'
                    } detected. Daily totals will be summed.`}
                </span>
              )}
            </div>

            <div className="overflow-x-auto border dark:border-neutral-600 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300">
                  <tr>
                    <th className="px-4 py-2 text-left">Row</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">{valueLabel}</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedRows.slice(0, MAX_PREVIEW_ROWS).map((row) => (
                    <tr key={row.rowIndex} className="border-t dark:border-neutral-600">
                      <td className="px-4 py-2 text-gray-500 dark:text-neutral-400">{row.rowIndex}</td>
                      <td className="px-4 py-2">
                        {row.dateIso ?? (row.rawDate ? row.rawDate : '—')}
                      </td>
                      <td className="px-4 py-2">
                        {row.amount !== null ? formatCurrency(row.amount) : row.rawValue || '—'}
                      </td>
                      <td className="px-4 py-2">
                        {row.dateIso && row.amount !== null ? (
                          <span className="text-green-600 dark:text-green-400">Ready</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Needs review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Replace existing balances for matching dates
              </label>
              {replaceExisting && existingDateMatches > 0 && (
                <span className="text-sm text-amber-600">
                  {existingDateMatches} existing balance{existingDateMatches === 1 ? '' : 's'} will be replaced.
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? 'Importing...' : 'Import Balances'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
