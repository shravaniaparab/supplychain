import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import MainLayout from '../../components/layout/MainLayout';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';
import {
  CreditCard,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Hourglass
} from 'lucide-react';

const PaymentsPage = () => {
  const { role, user } = useAuth();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const { formatNumber, formatCurrency, locale } = useLocalizedNumber();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [copiedText, setCopiedText] = useState('');

  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchPayments();
    fetchSummary();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/payments/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch payments: ${response.status}`);
      const data = await response.json();

      let results;
      if (Array.isArray(data)) {
        results = data;
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results;
      } else {
        results = [];
      }

      setPayments(results);
    } catch (err) {
      console.error('Payments fetch error:', err);
      setError(err.message);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/payments/summary/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclarePayment = async (paymentId) => {
    try {
      const response = await fetch(`${API_BASE}/api/payment/${paymentId}/declare/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to declare payment');
      toast.success('Payment marked as paid — awaiting confirmation from receiver');
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSettlePayment = async (paymentId) => {
    try {
      const response = await fetch(`${API_BASE}/api/payment/${paymentId}/settle/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to settle payment');
      toast.success('Payment confirmed and settled');
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const generateUPILink = (payment) => {
    const payeeUPI = payment.payee_upi_id || '';
    const payeeName = payment.payee_details?.user_details?.username || 'F2F_Participant';
    const amount = parseFloat(payment.amount).toFixed(2);
    const batchId = payment.batch_details?.product_batch_id || payment.batch;
    const paymentId = payment.id;

    // Requested exact format: upi://pay?pa={payee_upi}&pn={payee.name}&am={amount}&cu=INR&tn={batch_id}_{payment_id}
    return `upi://pay?pa=${payeeUPI}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${batchId}_${paymentId}`;
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const openUPILink = (payment) => {
    if (isMobile()) {
      const upiLink = generateUPILink(payment);
      window.location.href = upiLink;
      // After returning from UPI app, show modal for "Mark as Paid"
      setTimeout(() => {
        setSelectedPayment(payment);
        setShowPaymentModal(true);
      }, 500);
    } else {
      setSelectedPayment(payment);
      setShowPaymentModal(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.info('Copied to clipboard');
    setTimeout(() => setCopiedText(''), 2000);
  };

  const getStatusIcon = (s) => {
    switch (s) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'AWAITING_CONFIRMATION':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'SETTLED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusClass = (s) => {
    switch (s) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'AWAITING_CONFIRMATION':
        return 'bg-blue-100 text-blue-800';
      case 'SETTLED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (s) => {
    switch (s) {
      case 'PENDING': return t('payments.statusPending');
      case 'AWAITING_CONFIRMATION': return t('payments.statusAwaitingConfirmation');
      case 'SETTLED': return t('payments.statusSettled');
      default: return s;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getSummaryCards = () => {
    const roleLower = role?.toLowerCase();

    if (roleLower === 'farmer') {
      return [
        {
          title: t('payments.totalReceived'),
          value: summary.total_received || 0,
          icon: <Wallet className="w-6 h-6 text-green-600" />,
          color: 'bg-green-50 border-green-200',
          isCurrency: true,
        },
        {
          title: t('payments.totalPaidTransport'),
          value: summary.total_paid_transport || 0,
          icon: <ArrowUpRight className="w-6 h-6 text-red-600" />,
          color: 'bg-red-50 border-red-200',
          isCurrency: true,
        },
        {
          title: t('payments.pendingConfirmations'),
          value: summary.pending_confirmations || 0,
          icon: <Clock className="w-6 h-6 text-amber-600" />,
          color: 'bg-amber-50 border-amber-200',
          isCurrency: false,
        }
      ];
    } else if (roleLower === 'distributor') {
      return [
        {
          title: t('payments.receivedFromRetailers'),
          value: summary.total_received_from_retailers || 0,
          icon: <Wallet className="w-6 h-6 text-green-600" />,
          color: 'bg-green-50 border-green-200',
          isCurrency: true,
        },
        {
          title: t('payments.paidToFarmers'),
          value: summary.total_paid_to_farmers || 0,
          icon: <ArrowUpRight className="w-6 h-6 text-red-600" />,
          color: 'bg-red-50 border-red-200',
          isCurrency: true,
        },
        {
          title: t('payments.pendingPayments'),
          value: summary.pending_payments || 0,
          icon: <Clock className="w-6 h-6 text-amber-600" />,
          color: 'bg-amber-50 border-amber-200',
          isCurrency: true,
        }
      ];
    } else if (roleLower === 'transporter') {
      return [
        {
          title: t('payments.totalEarningsLabel'),
          value: summary.total_earnings || 0,
          icon: <Wallet className="w-6 h-6 text-green-600" />,
          color: 'bg-green-50 border-green-200',
          isCurrency: true,
        },
        {
          title: t('payments.pendingCount'),
          value: summary.pending_count || 0,
          icon: <Clock className="w-6 h-6 text-amber-600" />,
          color: 'bg-amber-50 border-amber-200',
          isCurrency: false,
        },
        {
          title: t('payments.settledCount'),
          value: summary.settled_count || 0,
          icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
          color: 'bg-blue-50 border-blue-200',
          isCurrency: false,
        }
      ];
    } else if (roleLower === 'retailer') {
      return [
        {
          title: t('payments.paidToDistributor'),
          value: summary.total_paid_to_distributor || 0,
          icon: <Wallet className="w-6 h-6 text-green-600" />,
          color: 'bg-green-50 border-green-200',
          isCurrency: true,
        },
        {
          title: t('payments.paidTransport'),
          value: summary.total_paid_transport || 0,
          icon: <ArrowUpRight className="w-6 h-6 text-red-600" />,
          color: 'bg-red-50 border-red-200',
          isCurrency: true,
        },
        {
          title: t('payments.pendingPayments'),
          value: summary.pending_payments || 0,
          icon: <Clock className="w-6 h-6 text-amber-600" />,
          color: 'bg-amber-50 border-amber-200',
          isCurrency: true,
        }
      ];
    }
    return [];
  };

  const isUserPayer = (payment) => {
    return payment.payer_details?.user_details?.id === user?.id;
  };

  const isUserPayee = (payment) => {
    return payment.payee_details?.user_details?.id === user?.id;
  };

  const formatValue = (card) => {
    if (card.isCurrency) {
      return formatCurrency(card.value);
    }
    return formatNumber(card.value);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">{t('payments.loadingPayments')}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-600" />
            {t('payments.title')}
          </h1>
          <p className="text-gray-600 mt-2">{t('payments.manageTransactions')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {getSummaryCards().map((card, index) => (
            <div key={index} className={`rounded-xl border p-6 ${card.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatValue(card)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{t('payments.transactionHistory')}</h2>
          </div>

          {/* Desktop Table View - Hidden on Mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.batchId')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.counterparty')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.type')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.amount')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.status')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.date')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('payments.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      {t('payments.noPaymentsFound')}
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {payment.batch_details?.product_batch_id || payment.batch}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {payment.counterparty_name || t('payments.unknown')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {payment.payment_type === 'BATCH_PAYMENT' ? t('payments.batchPayment') : t('payments.transportShare')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(payment.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {/* PENDING + payer => Pay Now button */}
                        {payment.status === 'PENDING' && isUserPayer(payment) && (
                          <button
                            onClick={() => openUPILink(payment)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t('payments.payNow')}
                          </button>
                        )}
                        {/* AWAITING_CONFIRMATION + payee => Confirm Receipt */}
                        {payment.status === 'AWAITING_CONFIRMATION' && isUserPayee(payment) && (
                          <button
                            onClick={() => handleSettlePayment(payment.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            {t('payments.confirmReceipt')}
                          </button>
                        )}
                        {/* AWAITING_CONFIRMATION + payer => waiting badge */}
                        {payment.status === 'AWAITING_CONFIRMATION' && isUserPayer(payment) && (
                          <span className="text-xs text-blue-600 font-medium">{t('payments.waitingConfirmation')}</span>
                        )}
                        {/* SETTLED => completed */}
                        {payment.status === 'SETTLED' && (
                          <span className="text-sm text-green-600 font-medium">{t('payments.completed')}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Shown only on Mobile */}
          <div className="md:hidden divide-y divide-gray-200">
            {payments.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                {t('payments.noPaymentsFound')}
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{payment.batch_details?.product_batch_id || payment.batch}
                    </span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(payment.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('payments.counterparty')}:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {payment.counterparty_name || t('payments.unknown')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('payments.type')}:</span>
                      <span className="text-sm text-gray-900">
                        {payment.payment_type === 'BATCH_PAYMENT' ? t('payments.batchPayment') : t('payments.transportShare')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('payments.amount')}:</span>
                      <span className="text-base font-bold text-emerald-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('payments.date')}:</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(payment.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-gray-100">
                    {payment.status === 'PENDING' && isUserPayer(payment) && (
                      <button
                        onClick={() => openUPILink(payment)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('payments.payNow')}
                      </button>
                    )}
                    {payment.status === 'AWAITING_CONFIRMATION' && isUserPayee(payment) && (
                      <button
                        onClick={() => handleSettlePayment(payment.id)}
                        className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        {t('payments.confirmReceipt')}
                      </button>
                    )}
                    {payment.status === 'AWAITING_CONFIRMATION' && isUserPayer(payment) && (
                      <div className="text-center text-sm text-blue-600 font-medium py-2">
                        {t('payments.waitingConfirmation')}
                      </div>
                    )}
                    {payment.status === 'SETTLED' && (
                      <div className="text-center text-sm text-green-600 font-medium py-2">
                        {t('payments.completed')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Modal for Desktop — with UPI QR + Mark as Paid */}
        {showPaymentModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('payments.paymentDetails')}</h3>

              {/* QR Code Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                  <QRCodeSVG
                    value={generateUPILink(selectedPayment)}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t('payments.scanQR')}
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-4">{t('payments.orUseDetails')}</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('payments.payeeUpiId')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{selectedPayment.payee_upi_id || t('payments.notSet')}</span>
                    {selectedPayment.payee_upi_id && (
                      <button
                        onClick={() => copyToClipboard(selectedPayment.payee_upi_id)}
                        className={`text-xs transition-colors ${copiedText === selectedPayment.payee_upi_id ? 'text-green-600' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {copiedText === selectedPayment.payee_upi_id ? t('common.copied') : t('common.copy')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('payments.payeeName')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedPayment.payee_details?.user_details?.first_name || selectedPayment.payee_details?.user_details?.username || t('payments.unknown')}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('payments.amountLabel')}</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t('payments.reference')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedPayment.batch_details?.product_batch_id || selectedPayment.batch}_payment
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('payments.close')}
                </button>
                <button
                  onClick={() => {
                    handleDeclarePayment(selectedPayment.id);
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  {t('payments.markAsPaid')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PaymentsPage;
