import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sprout,
  Warehouse,
  Store,
  FileText
} from 'lucide-react';
import { inspectionAPI } from '../../services/api';

const STAGE_CONFIG = {
  farmer: {
    label: 'Product Description',
    icon: Sprout,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
  },
  distributor: {
    label: 'Distributor',
    icon: Warehouse,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
  },
  retailer: {
    label: 'Retailer',
    icon: Store,
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
  },
};

const RESULT_CONFIG = {
  PASS: {
    label: 'Passed',
    icon: CheckCircle,
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  FAIL: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

const InspectionTimeline = ({ batchId, inspections: propInspections }) => {
  const [inspections, setInspections] = useState(propInspections || []);
  const [loading, setLoading] = useState(!propInspections);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Debug: Log inspections data
  useEffect(() => {
    console.log('InspectionTimeline - inspections:', inspections);
    inspections.forEach((insp, idx) => {
      console.log(`Inspection ${idx}:`, insp.stage, 'report_file:', insp.report_file);
    });
  }, [inspections]);

  useEffect(() => {
    // Update inspections when prop changes
    if (propInspections !== undefined) {
      setInspections(propInspections || []);
    }
    if (!propInspections && batchId) {
      fetchInspections();
    }
  }, [batchId, propInspections]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await inspectionAPI.getBatchTimeline(batchId);
      setInspections(response.data);
    } catch (err) {
      console.error('Error fetching inspection timeline:', err);
      setError('Failed to load inspection history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Timeline</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Timeline</h3>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!inspections || inspections.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Timeline</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No inspections recorded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Inspections will appear here as stakeholders complete them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Inspection Timeline</h3>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
          {inspections.length} inspection{inspections.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {inspections.map((inspection, index) => {
            const stageConfig = STAGE_CONFIG[inspection.stage] || STAGE_CONFIG.farmer;
            const resultConfig = RESULT_CONFIG[inspection.result] || RESULT_CONFIG.PASS;
            const StageIcon = stageConfig.icon;
            const ResultIcon = resultConfig.icon;
            const isExpanded = expandedId === index;

            return (
              <div key={index} className="relative flex gap-4">
                {/* Timeline node */}
                <div className={`relative z-10 w-10 h-10 rounded-full ${stageConfig.bgColor} ${stageConfig.borderColor} border-2 flex items-center justify-center flex-shrink-0`}>
                  <StageIcon className={`w-5 h-5 ${stageConfig.textColor}`} />
                </div>

                {/* Content card */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${isExpanded
                        ? `${stageConfig.bgColor} ${stageConfig.borderColor} border-2`
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setExpandedId(isExpanded ? null : index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${stageConfig.textColor}`}>
                            {stageConfig.label}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${resultConfig.bgColor} ${resultConfig.textColor}`}>
                            <ResultIcon className="w-3 h-3" />
                            {resultConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {inspection.created_by || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(inspection.created_at)}
                          </span>
                        </div>
                      </div>
                      <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {inspection.inspection_notes ? (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">{inspection.stage === 'farmer' ? 'Product Description' : 'Inspection Notes'}</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {inspection.inspection_notes}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic mb-4">No notes provided</p>
                        )}

                        {/* Display Images */}
                        {inspection.report_file && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              {inspection.stage === 'farmer' ? 'Product Images' : 'Inspection Images'}
                            </h4>
                            <div className="flex gap-2 flex-wrap">
                              <img
                                src={inspection.report_file}
                                alt="Inspection"
                                className="w-32 h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(inspection.report_file, '_blank');
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InspectionTimeline;
