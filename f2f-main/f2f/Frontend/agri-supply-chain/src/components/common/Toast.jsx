import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const iconMap = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
};

const colorMap = {
    success: {
        bg: 'bg-emerald-50 border-emerald-300',
        icon: 'text-emerald-600',
        text: 'text-emerald-900',
        progress: 'bg-emerald-500',
    },
    error: {
        bg: 'bg-red-50 border-red-300',
        icon: 'text-red-600',
        text: 'text-red-900',
        progress: 'bg-red-500',
    },
    warning: {
        bg: 'bg-amber-50 border-amber-300',
        icon: 'text-amber-600',
        text: 'text-amber-900',
        progress: 'bg-amber-500',
    },
    info: {
        bg: 'bg-blue-50 border-blue-300',
        icon: 'text-blue-600',
        text: 'text-blue-900',
        progress: 'bg-blue-500',
    },
};

const Toast = ({ id, message, type = 'info', duration = 3500, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const colors = colorMap[type] || colorMap.info;

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setVisible(true));

        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <div
            className={`toast-item ${colors.bg} border rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 min-w-[320px] max-w-[440px] transition-all duration-300 ${visible && !exiting
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-8'
                }`}
        >
            <span className={`mt-0.5 flex-shrink-0 ${colors.icon}`}>
                {iconMap[type]}
            </span>
            <p className={`text-sm font-medium flex-1 ${colors.text}`}>{message}</p>
            <button
                onClick={() => {
                    setExiting(true);
                    setTimeout(() => onClose(id), 300);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
                <div
                    className={`h-full ${colors.progress}`}
                    style={{
                        animation: `toast-progress ${duration}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
};

export default Toast;
