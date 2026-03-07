import React, { useState } from 'react';
import { Ban, X, Loader2 } from 'lucide-react';

const SuspendModal = ({ isOpen, onClose, onConfirm, batchId, loading }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(batchId, reason);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-cosmos-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-emerald-100 dark:border-cosmos-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-cosmos-700 bg-red-50/50 dark:bg-red-900/10">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                        <Ban className="w-5 h-5" />
                        <span>Suspend Batch</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-cosmos-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-gray-600 dark:text-cosmos-300 text-sm mb-4">
                        Are you sure you want to suspend this batch? This action will freeze all further operations on it. Please provide a reason below.
                    </p>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-cosmos-200 mb-2">
                            Reason for Suspension *
                        </label>
                        <textarea
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-cosmos-900 border border-gray-200 dark:border-cosmos-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                            placeholder="e.g., Quality issues detected, Incorrect data entry..."
                            rows="4"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-cosmos-700 text-gray-700 dark:text-cosmos-300 rounded-xl hover:bg-gray-50 dark:hover:bg-cosmos-700 font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Ban className="w-4 h-4" />
                                    Suspend Batch
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuspendModal;
