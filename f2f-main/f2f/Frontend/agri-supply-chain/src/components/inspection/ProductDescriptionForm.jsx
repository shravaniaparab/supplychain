import React, { useState } from 'react';
import { X, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { inspectionAPI } from '../../services/api';

const ProductDescriptionForm = ({ 
  batch, 
  onClose, 
  onSuccess,
  inline = false,
}) => {
  const [formData, setFormData] = useState({
    description: batch.inspection_notes || '',
    images: [],
    previewUrls: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Limit to 3 images
      const newFiles = files.slice(0, 3 - formData.images.length);
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newFiles].slice(0, 3),
        previewUrls: [...prev.previewUrls, ...newPreviewUrls].slice(0, 3),
      }));
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      previewUrls: prev.previewUrls.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Upload images first and get base64 data
      const imageData = await Promise.all(
        formData.images.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        })
      );

      // Create inspection with PASS result and description as notes
      const data = {
        batch: batch.id,
        stage: 'farmer',
        result: 'PASS',
        inspection_notes: formData.description,
        report_file: imageData.length > 0 ? imageData[0] : null, // Primary image
      };

      await inspectionAPI.create(data);
      onSuccess?.();
      if (!inline) {
        onClose();
      }
    } catch (err) {
      console.error('Description creation error:', err);
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to save product description');
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Product Description</h2>
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
          <div className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5">!</div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Quality Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            placeholder="Describe the product quality, freshness, appearance, growing conditions..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This description will be visible to consumers when they scan the QR code
          </p>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Images (Optional, max 3)
          </label>
          
          {/* Preview existing images */}
          {formData.previewUrls.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {formData.previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {formData.images.length < 3 && (
            <div className="relative">
              <input
                type="file"
                onChange={handleImageChange}
                accept="image/*"
                multiple
                className="hidden"
                id="product-images"
              />
              <label
                htmlFor="product-images"
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 cursor-pointer transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload product images
                </span>
              </label>
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
            disabled={submitting || !formData.description.trim()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Save Description
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

export default ProductDescriptionForm;
