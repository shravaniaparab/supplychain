import React, { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { inspectionAPI } from '../../services/api';

const RESULT_OPTIONS = [
  { value: 'PASS', label: 'Pass', color: 'green', icon: CheckCircle },
  { value: 'WARNING', label: 'Warning', color: 'yellow', icon: AlertTriangle },
  { value: 'FAIL', label: 'Fail', color: 'red', icon: AlertCircle },
];

const STAGE_LABELS = {
  farmer: 'Farmer Description',
  distributor: 'Distributor Inspection',
  retailer: 'Retailer Inspection',
};

const InspectionForm = ({ 
  batch, 
  stage, 
  onClose, 
  onSuccess,
  title = null,
  allowMultiple = true,
  inline = false,
}) => {
  const [formData, setFormData] = useState({
    result: 'PASS',
    inspection_notes: '',
    report_file: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const displayTitle = title || STAGE_LABELS[stage] || 'Inspection';

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, report_file: file });
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Convert file to base64 if present
      let reportFileBase64 = null;
      if (formData.report_file) {
        reportFileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // reader.result contains data URL like "data:image/jpeg;base64,/9j/4AAQ..."
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(formData.report_file);
        });
      }

      const data = {
        batch: batch.id,
        stage: stage,
        result: formData.result,
        inspection_notes: formData.inspection_notes,
        report_file: reportFileBase64,
      };

      await inspectionAPI.create(data);
      onSuccess?.();
      if (!inline) {
        onClose();
      }
    } catch (err) {
      console.error('Inspection creation error:', err);
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to create inspection report');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedResult = RESULT_OPTIONS.find(r => r.value === formData.result);
  const ResultIcon = selectedResult?.icon || CheckCircle;

  const formContent = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-${selectedResult?.color || 'green'}-100 flex items-center justify-center`}>
            <ResultIcon className={`w-5 h-5 text-${selectedResult?.color || 'green'}-600`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{displayTitle}</h2>
            <p className="text-sm text-gray-500">{batch.product_batch_id} - {batch.crop_type}</p>
          </div>
        </div>
        {!inline && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stage indicator - read only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm capitalize">
            {stage}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Stage is automatically set based on your role
          </p>
        </div>

        {/* Result selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Result *</label>
          <div className="grid grid-cols-3 gap-2">
            {RESULT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = formData.result === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, result: option.value })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? `text-${option.color}-600` : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${isSelected ? `text-${option.color}-700` : 'text-gray-600'}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inspection notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inspection Notes
          </label>
          <textarea
            value={formData.inspection_notes}
            onChange={(e) => setFormData({ ...formData, inspection_notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Enter detailed inspection observations..."
          />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supporting Document (Optional)
          </label>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              id="inspection-file"
            />
            <label
              htmlFor="inspection-file"
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {formData.report_file ? formData.report_file.name : 'Click to upload document'}
              </span>
            </label>
          </div>
          {previewUrl && (
            <div className="mt-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-32 rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
              formData.result === 'PASS'
                ? 'bg-green-600 hover:bg-green-700'
                : formData.result === 'WARNING'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ResultIcon className="w-4 h-4" />
                Submit Inspection
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );

  if (inline) {
    return <div className="bg-white rounded-xl p-2">{formContent}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {formContent}
      </div>
    </div>
  );
};

export default InspectionForm;
