import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { useSettings } from '../contexts/SettingsContext';

// Common expense categories with keywords for auto-detection
const CATEGORY_KEYWORDS = {
  'Groceries': ['grocery', 'supermarket', 'walmart', 'costco', 'kroger', 'safeway', 'trader joe', 'whole foods', 'aldi', 'publix', 'food', 'market'],
  'Dining Out': ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'pizza', 'subway', 'chipotle', 'taco', 'diner', 'bistro'],
  'Utilities': ['electric', 'gas', 'water', 'utility', 'power', 'energy', 'sewage', 'pge', 'edison'],
  'Phone Bills': ['phone', 'mobile', 'cellular', 'verizon', 'at&t', 'att', 't-mobile', 'tmobile', 'sprint'],
  'Internet Bill': ['internet', 'wifi', 'broadband', 'comcast', 'xfinity', 'spectrum', 'cox'],
  'Rent': ['rent', 'lease', 'housing', 'apartment'],
  'Car Insurance': ['car insurance', 'auto insurance', 'geico', 'progressive', 'state farm', 'allstate'],
  'Car EMI': ['car payment', 'auto loan', 'vehicle payment'],
  'Health': ['pharmacy', 'cvs', 'walgreens', 'medical', 'doctor', 'hospital', 'clinic', 'health', 'prescription', 'rx'],
  'Gas/Fuel': ['gas station', 'fuel', 'shell', 'chevron', 'exxon', 'mobil', 'bp', 'arco', 'costco gas'],
  'Shopping': ['amazon', 'target', 'best buy', 'home depot', 'lowes', 'ikea', 'mall', 'store'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'theater', 'concert', 'ticket'],
  'Travel': ['hotel', 'airbnb', 'airline', 'flight', 'uber', 'lyft', 'taxi', 'parking'],
  'Other': []
};

export default function BillScanner({ onScanComplete }) {
  const { settings } = useSettings();
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large. Please select an image under 10MB.');
      return;
    }

    setError('');
    setPreview(URL.createObjectURL(file));
    await processImage(file);
  };

  const processImage = async (file) => {
    setIsScanning(true);
    setProgress(0);
    setScanResult(null);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extractedData = parseReceiptText(result.data.text);
      setScanResult(extractedData);

      if (onScanComplete) {
        onScanComplete(extractedData);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to scan image. Please try again or enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const parseReceiptText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const lowerText = text.toLowerCase();

    // Extract amount - look for total, grand total, or currency patterns
    let amount = null;
    const amountPatterns = [
      /(?:total|grand total|amount due|balance due|subtotal)[:\s]*[\$]?\s*([\d,]+\.?\d*)/i,
      /[\$]\s*([\d,]+\.\d{2})/,
      /(?:usd|inr|eur|gbp)[:\s]*([\d,]+\.?\d*)/i,
      /([\d,]+\.\d{2})(?:\s*(?:usd|total))/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // If no amount found with patterns, look for the largest dollar amount
    if (!amount) {
      const dollarAmounts = text.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [];
      const amounts = dollarAmounts.map(a => parseFloat(a.replace(/[$,]/g, ''))).filter(a => a > 0);
      if (amounts.length > 0) {
        amount = Math.max(...amounts);
      }
    }

    // Extract date
    let date = null;
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const parsedDate = new Date(match[1]);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Extract merchant/store name (usually first few lines)
    let merchant = '';
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      // Skip lines that look like addresses or phone numbers
      if (!/^\d+\s|phone|tel:|fax:|www\.|\.com|@/.test(line.toLowerCase()) && line.length > 2 && line.length < 50) {
        merchant = line;
        break;
      }
    }

    // Detect category based on keywords
    let category = 'Other';
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          category = cat;
          break;
        }
      }
      if (category !== 'Other') break;
    }

    return {
      amount: amount || '',
      date: date || new Date().toISOString().split('T')[0],
      merchant: merchant,
      category: category,
      rawText: text,
      currency: currency,
      confidence: amount ? 'high' : 'low'
    };
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
      await processImage(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearScan = () => {
    setPreview(null);
    setScanResult(null);
    setError('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bill-scanner">
      {!preview ? (
        <div
          className="upload-zone border border-2 border-dashed rounded p-4 text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ borderColor: 'var(--border-color)', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="d-none"
            capture="environment"
          />
          <div className="mb-3">
            <span style={{ fontSize: '48px' }}>📷</span>
          </div>
          <h5>Scan Receipt / Bill</h5>
          <p className="text-muted mb-2">
            Drop an image here or click to upload
          </p>
          <small className="text-muted">
            Supports JPG, PNG • Max 10MB • Free OCR powered by Tesseract.js
          </small>
        </div>
      ) : (
        <div>
          {/* Preview */}
          <div className="position-relative mb-3">
            <img
              src={preview}
              alt="Receipt preview"
              className="img-fluid rounded"
              style={{ maxHeight: '200px', objectFit: 'contain', width: '100%' }}
            />
            <button
              className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
              onClick={clearScan}
            >
              ✕
            </button>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <small>Scanning receipt...</small>
                <small>{progress}%</small>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div
                  className="progress-bar bg-danger progress-bar-striped progress-bar-animated"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert alert-danger py-2 mb-3">
              {error}
            </div>
          )}

          {/* Scan Results */}
          {scanResult && !isScanning && (
            <div className="scan-results">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">📋 Extracted Data</h6>
                <span className={`badge ${scanResult.confidence === 'high' ? 'bg-success' : 'bg-warning'}`}>
                  {scanResult.confidence === 'high' ? 'High Confidence' : 'Review Required'}
                </span>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small">Amount ({settings.currency})</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">{settings.currencySymbol}</span>
                    <input
                      type="text"
                      className="form-control"
                      value={scanResult.amount || 'Not detected'}
                      readOnly
                    />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small">Date</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={scanResult.date}
                    readOnly
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small">Merchant</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={scanResult.merchant || 'Not detected'}
                    readOnly
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small">Category</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={scanResult.category}
                    readOnly
                  />
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-danger flex-grow-1"
                  onClick={() => onScanComplete && onScanComplete(scanResult)}
                >
                  ✓ Use This Data
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={clearScan}
                >
                  Rescan
                </button>
              </div>

              {/* Raw Text Toggle */}
              <details className="mt-3">
                <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                  View raw OCR text
                </summary>
                <pre className="bg-dark text-light p-2 rounded mt-2" style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
                  {scanResult.rawText}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
