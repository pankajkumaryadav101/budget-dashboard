import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { createAsset, updateAsset } from '../api/api';

// Asset type configurations with icons and specific fields
const ASSET_TYPE_CONFIG = {
  GOLD: { icon: '🥇', fields: ['quantity', 'purity'], quantityLabel: 'Weight (grams)', defaultUnit: 'grams' },
  LAND: { icon: '🏞️', fields: ['quantity', 'purchaseYear'], quantityLabel: 'Area (sq ft)', defaultUnit: 'sq ft' },
  REAL_ESTATE: { icon: '🏠', fields: ['purchaseYear'], quantityLabel: 'Area (sq ft)', defaultUnit: 'sq ft' },
  CAR: { icon: '🚗', fields: ['purchaseYear', 'mileage', 'condition'] },
  JEWELRY: { icon: '💎', fields: ['quantity', 'purity'], quantityLabel: 'Weight (grams)', defaultUnit: 'grams' },
  ELECTRONICS: { icon: '📱', fields: ['purchaseYear'] },
  DOCUMENTS: { icon: '📄', fields: [] },
  CASH: { icon: '💵', fields: [] },
  STOCKS: { icon: '📈', fields: ['quantity'], quantityLabel: 'Number of Shares' },
  CRYPTO: { icon: '₿', fields: ['quantity'], quantityLabel: 'Amount' },
  OTHER: { icon: '📦', fields: ['quantity'] }
};

export default function AddAssetForm({ editAsset, onSave, onCancel }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    type: 'OTHER',
    description: '',
    storageLocation: '',
    purchasePrice: '',
    currentMarketPrice: '',
    quantity: '',
    unit: '',
    purity: '24',
    purchaseYear: new Date().getFullYear(),
    mileage: '',
    condition: 'good',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const assetTypes = Object.keys(ASSET_TYPE_CONFIG);

  useEffect(() => {
    if (editAsset) {
      setFormData({
        name: editAsset.name || '',
        type: editAsset.type || 'OTHER',
        description: editAsset.description || '',
        storageLocation: editAsset.storageLocation || '',
        purchasePrice: editAsset.purchasePrice || '',
        currentMarketPrice: editAsset.currentMarketPrice || '',
        quantity: editAsset.quantity || '',
        unit: editAsset.unit || '',
        purity: editAsset.purity || '24',
        purchaseYear: editAsset.purchaseYear || new Date().getFullYear(),
        mileage: editAsset.mileage || '',
        condition: editAsset.condition || 'good',
        notes: editAsset.notes || ''
      });
    }
  }, [editAsset]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-set unit when type changes
      if (name === 'type' && ASSET_TYPE_CONFIG[value]?.defaultUnit) {
        updated.unit = ASSET_TYPE_CONFIG[value].defaultUnit;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const assetData = {
      id: editAsset?.id || Date.now().toString(),
      name: formData.name,
      type: formData.type,
      description: formData.description,
      storageLocation: formData.storageLocation,
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
      currentMarketPrice: formData.currentMarketPrice ? parseFloat(formData.currentMarketPrice) : null,
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      unit: formData.unit,
      purity: formData.type === 'GOLD' || formData.type === 'JEWELRY' ? parseInt(formData.purity) : null,
      purchaseYear: formData.purchaseYear ? parseInt(formData.purchaseYear) : null,
      mileage: formData.mileage ? parseInt(formData.mileage) : null,
      condition: formData.condition,
      notes: formData.notes,
      currency: settings.currency,
      lastVerifiedDate: editAsset?.lastVerifiedDate || new Date().toISOString(),
      createdAt: editAsset?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editAsset) {
        await updateAsset(editAsset.id, assetData);
      } else {
        await createAsset(assetData);
      }

      // Also save to localStorage
      const localAssets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
      if (editAsset) {
        const idx = localAssets.findIndex(a => a.id === editAsset.id);
        if (idx >= 0) localAssets[idx] = assetData;
        else localAssets.push(assetData);
      } else {
        localAssets.push(assetData);
      }
      localStorage.setItem('assets_v1', JSON.stringify(localAssets));

      // Reset form
      setFormData({
        name: '', type: 'OTHER', description: '', storageLocation: '',
        purchasePrice: '', currentMarketPrice: '', quantity: '', unit: '',
        purity: '24', purchaseYear: new Date().getFullYear(), mileage: '',
        condition: 'good', notes: ''
      });

      if (onSave) onSave();
    } catch (err) {
      // Still save locally even if API fails
      const localAssets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
      if (editAsset) {
        const idx = localAssets.findIndex(a => a.id === editAsset.id);
        if (idx >= 0) localAssets[idx] = assetData;
        else localAssets.push(assetData);
      } else {
        localAssets.push(assetData);
      }
      localStorage.setItem('assets_v1', JSON.stringify(localAssets));

      if (onSave) onSave();
    } finally {
      setLoading(false);
    }
  };

  const typeConfig = ASSET_TYPE_CONFIG[formData.type] || ASSET_TYPE_CONFIG.OTHER;
  const showField = (field) => typeConfig.fields?.includes(field);

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: '32px' }}>{typeConfig.icon}</span>
        <h5 className="mb-0">{editAsset ? 'Edit Asset' : 'Add New Asset'}</h5>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Basic Info */}
      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <label className="form-label">Asset Name *</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Gold Chain, Land in Texas, BMW X5"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Type *</label>
          <select className="form-select" name="type" value={formData.type} onChange={handleChange} required>
            {assetTypes.map(type => (
              <option key={type} value={type}>
                {ASSET_TYPE_CONFIG[type].icon} {type.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="mb-3">
        <label className="form-label">📍 Storage Location *</label>
        <input
          type="text"
          className="form-control"
          name="storageLocation"
          value={formData.storageLocation}
          onChange={handleChange}
          required
          placeholder="e.g., Bank locker #42, Garage, California"
        />
        <small className="text-muted">Where is this item stored? This helps track your valuables.</small>
      </div>

      {/* Type-specific fields */}
      <div className="row g-3 mb-3">
        {/* Quantity/Weight */}
        {(showField('quantity') || formData.type === 'GOLD' || formData.type === 'JEWELRY') && (
          <div className="col-md-4">
            <label className="form-label">{typeConfig.quantityLabel || 'Quantity'}</label>
            <div className="input-group">
              <input
                type="number"
                className="form-control"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                step="0.01"
              />
              <span className="input-group-text">{formData.unit || typeConfig.defaultUnit || 'units'}</span>
            </div>
          </div>
        )}

        {/* Gold Purity */}
        {(formData.type === 'GOLD' || formData.type === 'JEWELRY') && (
          <div className="col-md-4">
            <label className="form-label">Purity (Karat)</label>
            <select className="form-select" name="purity" value={formData.purity} onChange={handleChange}>
              <option value="24">24K (99.9% Pure)</option>
              <option value="22">22K (91.6% Pure)</option>
              <option value="18">18K (75% Pure)</option>
              <option value="14">14K (58.3% Pure)</option>
            </select>
          </div>
        )}

        {/* Purchase Year */}
        {showField('purchaseYear') && (
          <div className="col-md-4">
            <label className="form-label">Purchase Year</label>
            <input
              type="number"
              className="form-control"
              name="purchaseYear"
              value={formData.purchaseYear}
              onChange={handleChange}
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>
        )}

        {/* Car specific fields */}
        {formData.type === 'CAR' && (
          <>
            <div className="col-md-4">
              <label className="form-label">Mileage</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  placeholder="0"
                />
                <span className="input-group-text">miles</span>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Condition</label>
              <select className="form-select" name="condition" value={formData.condition} onChange={handleChange}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Prices */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label">Purchase Price ({settings.currencySymbol})</label>
          <div className="input-group">
            <span className="input-group-text">{settings.currencySymbol}</span>
            <input
              type="number"
              className="form-control"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <small className="text-muted">Original purchase amount</small>
        </div>
        <div className="col-md-6">
          <label className="form-label">Current Market Price ({settings.currencySymbol})</label>
          <div className="input-group">
            <span className="input-group-text">{settings.currencySymbol}</span>
            <input
              type="number"
              className="form-control"
              name="currentMarketPrice"
              value={formData.currentMarketPrice}
              onChange={handleChange}
              placeholder="Auto-calculated for Gold/Real Estate"
              step="0.01"
            />
          </div>
          <small className="text-muted">
            {formData.type === 'GOLD' || formData.type === 'REAL_ESTATE'
              ? 'Leave blank for auto-calculation'
              : 'Estimated current value'}
          </small>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any additional details, serial numbers, etc."
          rows="2"
        />
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-outline-secondary">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading} className="btn btn-danger">
          {loading ? '⏳ Saving...' : (editAsset ? '💾 Update Asset' : '➕ Add Asset')}
        </button>
      </div>
    </form>
  );
}
