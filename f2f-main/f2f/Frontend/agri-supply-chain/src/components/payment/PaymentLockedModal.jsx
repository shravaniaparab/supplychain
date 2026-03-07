import React from 'react';
import { X, Lock, CreditCard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentLockedModal = ({ isOpen, onClose, batchData }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleGoToPayments = () => {
        onClose();
        navigate('/payments');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-amber-50 p-6 flex items-center justify-between border-b border-amber-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-amber-900">Action Blocked</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-4 text-center">
                    <div className="text-gray-600 leading-relaxed">
                        <p className="font-semibold text-gray-900 mb-2 text-lg">
                            Payment Settlement Required
                        </p>
                        <p>
                            Batch <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                {batchData?.product_batch_id || 'Unknown'}
                            </span> is currently locked.
                        </p>
                        <p className="mt-4">
                            All pending payments for the current phase must be settled before you can proceed with this action.
                        </p>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            onClick={handleGoToPayments}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
                        >
                            <CreditCard size={20} />
                            Go to Payments
                            <ArrowRight size={20} className="opacity-50" />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-3 px-6 rounded-xl transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>

                {/* Footer info */}
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5 uppercase tracking-wider font-semibold">
                        Status: {batchData?.financial_status || 'PAYMENT_PENDING'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentLockedModal;
