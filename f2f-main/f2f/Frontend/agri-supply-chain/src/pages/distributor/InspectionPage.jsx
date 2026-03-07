import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { batchAPI, inspectionAPI } from '../../services/api';
import { InspectionForm, InspectionTimeline } from '../../components/inspection';
import { useToast } from '../../context/ToastContext';

const InspectionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inspections, setInspections] = useState([]);
    const [hasInspectorInspection, setHasInspectorInspection] = useState(false);

    useEffect(() => {
        fetchBatch();
    }, [id]);

    const fetchBatch = async () => {
        try {
            const response = await batchAPI.get(id);
            setBatch(response.data);
            // Fetch inspections for this batch
            fetchInspections(id);
        } catch (error) {
            console.error('Error fetching batch:', error);
            toast.error('Failed to load batch details');
        } finally {
            setLoading(false);
        }
    };

    const fetchInspections = async (batchId) => {
        try {
            const response = await inspectionAPI.getBatchTimeline(batchId);
            setInspections(response.data);
            // Check if distributor already inspected
            const hasDistributor = response.data.some(i => i.stage === 'distributor');
            setHasInspectorInspection(hasDistributor);
        } catch (err) {
            console.log('No inspections for this batch');
            setInspections([]);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading batch details...</div>
                </div>
            </MainLayout>
        );
    }

    if (!batch) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-gray-500">Batch not found</p>
                    <button
                        onClick={() => navigate('/distributor/dashboard')}
                        className="mt-4 text-primary hover:underline"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/distributor/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Batch Inspection</h1>
                        <p className="text-gray-600">Review and inspect incoming batch</p>
                    </div>
                </div>

                {/* Batch Details Card */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <ClipboardCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Batch Details</h2>
                            <p className="text-sm text-gray-500">ID: {batch.product_batch_id}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Crop Type</p>
                            <p className="font-medium text-gray-900">{batch.crop_type}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Quantity</p>
                            <p className="font-medium text-gray-900">{batch.quantity || 0} kg</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Harvest Date</p>
                            <p className="font-medium text-gray-900">
                                {new Date(batch.harvest_date).toLocaleDateString('hi-IN')}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Current Status</p>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${batch.status === 'DELIVERED_TO_DISTRIBUTOR' ? 'bg-yellow-100 text-yellow-700' :
                                batch.status === 'STORED' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {batch.status?.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Farm Location</p>
                            <p className="font-medium text-gray-900">{batch.farm_location || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Current Owner</p>
                            <p className="font-medium text-gray-900">{batch.current_owner_username || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Inspection History Timeline */}
                <InspectionTimeline
                    batchId={id}
                    inspections={inspections}
                />

                {/* New Inspection Form - only show if not already inspected */}
                {!hasInspectorInspection && (
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Inspection Report</h2>
                        <InspectionForm
                            batch={batch}
                            stage="distributor"
                            onClose={() => navigate('/distributor/dashboard')}
                            onSuccess={() => {
                                fetchInspections(id);
                                setHasInspectorInspection(true);
                            }}
                            inline={true}
                        />
                    </div>
                )}

                {hasInspectorInspection && (
                    <div className="card p-6 bg-green-50 border-green-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <ClipboardCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-green-800">Inspection Complete</h3>
                                <p className="text-green-600">You have already submitted an inspection for this batch.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/distributor/dashboard')}
                            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default InspectionPage;
