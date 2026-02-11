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

  // Get placeholder examples based on type
  const getPlaceholder = (field) => {
    const placeholders = {
      GOLD: { name: 'e.g., Gold Chain 22K', location: 'e.g., Bank Locker #42, SBI Main Branch', price: 'Auto-calculated from weight' },
      LAND: { name: 'e.g., Farm Land Plot #5', location: 'e.g., 123 Rural Road, Austin, TX', price: 'e.g., 150000' },
      REAL_ESTATE: { name: 'e.g., 2BHK Apartment Downtown', location: 'e.g., 456 Main St, Apt 12B, NYC', price: 'e.g., 350000' },
      CAR: { name: 'e.g., 2022 Honda Accord', location: 'e.g., Home Garage', price: 'e.g., 28000' },
      JEWELRY: { name: 'e.g., Diamond Engagement Ring', location: 'e.g., Bedroom Safe', price: 'e.g., 5000' },
      ELECTRONICS: { name: 'e.g., MacBook Pro 16"', location: 'e.g., Home Office Desk', price: 'e.g., 2500' },
      DOCUMENTS: { name: 'e.g., Passport & Birth Certificate', location: 'e.g., Filing Cabinet Drawer 3', price: '' },
      CASH: { name: 'e.g., Emergency Cash', location: 'e.g., Hidden in Book Safe', price: 'e.g., 500' },
      STOCKS: { name: 'e.g., Apple Inc (AAPL)', location: 'e.g., Fidelity Brokerage Account', price: 'e.g., 15000' },
      CRYPTO: { name: 'e.g., Bitcoin', location: 'e.g., Coinbase Wallet', price: 'e.g., 25000' },
      OTHER: { name: 'e.g., Antique Collection', location: 'e.g., Living Room Display', price: 'e.g., 1000' }
    };
    return placeholders[formData.type]?.[field] || '';
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <span style={{ fontSize: '32px' }}>{typeConfig.icon}</span>
        <div>
          <h5 className="mb-0">{editAsset ? 'Edit Asset' : 'Add New Asset'}</h5>
          <small className="text-muted">Track where your valuables are stored</small>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Quick Type Selection */}
      <div className="mb-3">
        <label className="form-label">What are you adding? *</label>
        <div className="d-flex flex-wrap gap-2">
          {assetTypes.map(type => (
            <button
              key={type}
              type="button"
              className={`btn btn-sm ${formData.type === type ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => handleChange({ target: { name: 'type', value: type } })}
            >
              {ASSET_TYPE_CONFIG[type].icon} {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <label className="form-label">Name / Description *</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder={getPlaceholder('name')}
          />
        </div>
      </div>

      {/* Location */}
      <div className="mb-3">
        <label className="form-label">📍 Where is it stored? *</label>
        <input
          type="text"
          className="form-control"
          name="storageLocation"
          value={formData.storageLocation}
          onChange={handleChange}
          required
          placeholder={getPlaceholder('location')}
        />
        <small className="text-muted">Be specific! e.g., "Master Bedroom → Closet → Top Shelf → Blue Box"</small>
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

        {/* Purchase Year - for non-car assets that need it */}
        {showField('purchaseYear') && formData.type !== 'CAR' && (
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
              <label className="form-label">Purchase Year</label>
              <input
                type="number"
                className="form-control"
                name="purchaseYear"
                value={formData.purchaseYear}
                onChange={handleChange}
                min="1990"
                max={new Date().getFullYear()}
                placeholder={new Date().getFullYear().toString()}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Current Mileage</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  placeholder="e.g., 45000"
                />
                <span className="input-group-text">miles</span>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Condition</label>
              <select className="form-select" name="condition" value={formData.condition} onChange={handleChange}>
                <option value="excellent">Excellent - Like new</option>
                <option value="very good">Very Good - Minor wear</option>
                <option value="good">Good - Normal wear</option>
                <option value="fair">Fair - Visible wear</option>
                <option value="poor">Poor - Needs repairs</option>
              </select>
            </div>
            <div className="col-12">
              <div className="alert alert-info py-2 small mb-0">
                <strong>💡 How car value is calculated:</strong><br/>
                • <strong>Age:</strong> ~25% depreciation in year 1, then ~10-15% per year<br/>
                • <strong>Mileage:</strong> High mileage (&gt;15k/year) reduces value; low mileage adds value<br/>
                • <strong>Type:</strong> Trucks/SUVs hold value better; luxury cars depreciate faster<br/>
                • <strong>Condition:</strong> Excellent adds 12%; Poor reduces by 35%
              </div>
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
