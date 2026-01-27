'use client';

import { useFinance } from '@/context/FinanceContext';
import { Account } from '@/types/finance';

interface ManageAccountModalProps {
  account: Account;
  onSave: (updates: Pick<Account, 'name' | 'category' | 'type'>) => void;
  onClose: () => void;
}

export const ManageAccountModal: React.FC<ManageAccountModalProps> = ({ account, onSave, onClose }) => {
  const { categories } = useFinance();
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<Account['type']>(account.type);
  const [category, setCategory] = useState(account.category);

  const categoryOptions = useMemo(() => {
    const options = categories[type];
    return options.includes(category as string) ? options : [...options, category];
  }, [category, type, categories]);

  useEffect(() => {
    const options = categories[type];
    if (options && !options.includes(category) && options.length > 0) {
      setCategory(options[0]);
    }
  }, [category, type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({ name: trimmedName, category, type });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Account</h2>
            <p className="text-sm text-gray-500">Update the account name, type, or category.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Checking Account"
              required
            />
          </div>

          <div>
            <label htmlFor="account-type" className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value as Account['type'])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
            </select>
          </div>

          <div>
            <label htmlFor="account-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="account-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categoryOptions.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
