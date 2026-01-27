'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { AccountType } from '@/types/finance';

const CategoryManager: React.FC = () => {
    const { categories, addCategory, deleteCategory, accounts } = useFinance();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedType, setSelectedType] = useState<AccountType>('asset');
    const [error, setError] = useState('');

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!newCategoryName.trim()) {
            setError('Category name cannot be empty');
            return;
        }

        if (categories[selectedType].includes(newCategoryName.trim())) {
            setError('Category already exists');
            return;
        }

        addCategory(selectedType, newCategoryName.trim());
        setNewCategoryName('');
    };

    const handleDeleteCategory = (type: AccountType, name: string) => {
        // Check if category is in use
        const isInUse = accounts.some(
            acc => acc.type === type && acc.category === name
        );

        if (isInUse) {
            setError(`Cannot delete "${name}" because it is currently used by one or more accounts.`);
            return;
        }

        if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
            deleteCategory(type, name);
            setError('');
        }
    };

    const tabs: { id: AccountType; label: string }[] = [
        { id: 'asset', label: 'Assets' },
        { id: 'liability', label: 'Liabilities' },
        { id: 'equity', label: 'Equity' },
    ];

    return (
        <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">🏷️ Manage Categories</h2>
            <p className="text-gray-600 mb-6">
                Customize the categories available for your accounts. You can add new categories or remove unused ones.
            </p>

            {/* Type Tabs */}
            <div className="flex border-b mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setSelectedType(tab.id);
                            setError('');
                        }}
                        className={`px-4 py-2 font-medium text-sm focus:outline-none transition-colors border-b-2 ${selectedType === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleAddCategory} className="mb-6">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={`New ${selectedType} category name...`}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Add
                    </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </form>

            {/* Categories List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories[selectedType].length === 0 ? (
                    <p className="text-gray-500 italic text-center py-4">No categories found.</p>
                ) : (
                    categories[selectedType].map((category) => (
                        <div
                            key={category}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-md group hover:bg-gray-100 transition-colors"
                        >
                            <span className="text-gray-700">{category}</span>
                            <button
                                onClick={() => handleDeleteCategory(selectedType, category)}
                                className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete category"
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CategoryManager;
