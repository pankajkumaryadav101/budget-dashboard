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
  const [processingMode, setProcessingMode] = useState('itemized'); // 'itemized' or 'single'
  const [merchantOverride, setMerchantOverride] = useState('');
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

      // Remove automatic onScanComplete call - let user choose processing mode first
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

    console.log('OCR Raw Text:', text);
    console.log('Parsed Lines:', lines);

    // Extract individual line items from receipt
    const transactions = [];
    let totalAmount = null;

    // First, try to find the total amount - prioritize final total over subtotal
    const amountPatterns = [
      /(?:grand total|total|amount due|balance due)[:\s]*[\$]?\s*([\d,]+\.?\d*)/i,  // Prioritize final totals
      /(?:subtotal)[:\s]*[\$]?\s*([\d,]+\.?\d*)/i,  // Then subtotals
      /[\$]\s*([\d,]+\.\d{2})/,
      /(?:usd|inr|eur|gbp)[:\s]*([\d,]+\.?\d*)/i,
      /([\d,]+\.\d{2})(?:\s*(?:usd|total))/i,
    ];

    // Try to find the final total first
    let finalTotal = null;
    let subtotal = null;

    for (const line of lines) {
      for (const pattern of amountPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          const lineLower = line.toLowerCase();

          if (lineLower.includes('grand total') || lineLower.includes('total') || lineLower.includes('amount due') || lineLower.includes('balance due')) {
            finalTotal = amount;
          } else if (lineLower.includes('subtotal')) {
            subtotal = amount;
          }
        }
      }
    }

    // Use final total if found, otherwise use subtotal, otherwise use any amount found
    totalAmount = finalTotal || subtotal;

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

    // Extract merchant/store name - improved detection for Costco and other stores
    let merchant = '';
    const merchantPatterns = [
      /costco/i,
      /walmart/i,
      /target/i,
      /kroger/i,
      /safeway/i,
      /trader joe/i,
      /whole foods/i,
      /aldi/i,
      /publix/i,
      /starbucks/i,
      /mcdonald/i,
      /subway/i,
      /chipotle/i
    ];

    // First, check for known store names in the text
    for (const pattern of merchantPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        merchant = match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
        if (merchant === 'Costco') merchant = 'Costco Wholesale';
        break;
      }
    }

    // Expanded normalization for OCR misreads
    if (!merchant) {
      if (/s[\s:=\-]*wholesale/i.test(lowerText) && /costco/i.test(lowerText)) {
        merchant = 'Costco Wholesale';
      } else if (/s[\s:=\-]*wholesale/i.test(lowerText)) {
        merchant = 'Wholesale';
      }
    }

    // If no known store found, try the first few lines
    if (!merchant) {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        // Skip lines that look like addresses or phone numbers
        if (!/^\d+\s|phone|tel:|fax:|www\.|\.com|@|date|time|cashier|register/i.test(line.toLowerCase()) &&
            line.length > 2 && line.length < 50 &&
            !/^\d{1,2}[\/\-]\d{1,2}/.test(line)) { // Skip date-like lines
          merchant = line;
          break;
        }
      }
    }

    // Parse line items - improved patterns for various receipt formats
    const itemPatterns = [
      /^(.+?)\s+[\$]?\s*([\d,]+\.\d{2})$/,  // "Item Name $5.99"
      /^(.+?)\s+([\d,]+\.\d{2})\s*[\$]?$/,  // "Item Name 5.99$"
      /^(.+?)\s+x?\s*\d*\s*[\$]?\s*([\d,]+\.\d{2})$/,  // "Item Name x2 $5.99"
      /^(.+?)\s{2,}[\$]?\s*([\d,]+\.\d{2})$/,  // "Item Name    $5.99" (multiple spaces)
      /^(.+?)\s+qty\s*\d*\s*[\$]?\s*([\d,]+\.\d{2})$/i,  // "Item Name QTY 2 $5.99"
      /^(.+?)\s+@\s*[\$]?\s*([\d,]+\.\d{2})\s+ea/i,  // "Item Name @ $5.99 ea"
      /^(.+?)\s+([\d,]+\.\d{2})\s+ea$/i,  // "Item Name 5.99 ea"
      /^(.+?)\s*\*\s*[\$]?\s*([\d,]+\.\d{2})$/,  // "Item Name * $5.99"
    ];

    // More flexible price patterns for different receipt formats
    const priceAtEndPattern = /(.+?)\s+[\$]?\s*([\d,]+\.\d{2})\s*$/;
    const priceWithMultiplierPattern = /(.+?)\s+x\s*(\d+)\s*[\$]?\s*([\d,]+\.\d{2})$/i;  // "Item x 2 $5.99"

    console.log('Starting item detection...');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let foundItem = false;

      // Skip header lines, totals, tax, etc.
      if (/^(costco|date|time|cashier|register|subtotal|tax|total|change|card|credit|debit|visa|mastercard|american|discover|balance|due|amount)/i.test(line.toLowerCase())) {
        continue;
      }

      // Skip lines that are too short or look like addresses/phone numbers
      if (line.length < 3 || /^\d{3,}/.test(line) || /phone|tel|fax|www|@|\.com/i.test(line.toLowerCase())) {
        continue;
      }

      // Try multiplier pattern first (e.g., "Milk x 2 $5.99")
      const multiplierMatch = line.match(priceWithMultiplierPattern);
      if (multiplierMatch) {
        const description = multiplierMatch[1].trim();
        const quantity = parseInt(multiplierMatch[2]);
        const unitPrice = parseFloat(multiplierMatch[3].replace(/,/g, ''));
        const totalAmount = unitPrice * quantity;

        // Skip if this looks like a total or tax line
        if (/total|tax|subtotal|change|cash|card|credit|debit|balance|due/i.test(description.toLowerCase())) {
          continue;
        }

        // Skip very small amounts or very large amounts
        if (totalAmount < 0.5 || totalAmount > 1000) continue;

        // Detect category for this item
        let category = 'Other';
        const itemLower = description.toLowerCase();
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          for (const keyword of keywords) {
            if (itemLower.includes(keyword)) {
              category = cat;
              break;
            }
          }
          if (category !== 'Other') break;
        }

        // Include merchant in description for better context
        const fullDescription = merchant ? `${merchant} - ${description} (x${quantity})` : `${description} (x${quantity})`;

        transactions.push({
          amount: totalAmount,
          description: fullDescription,
          category: category,
          date: date || new Date().toISOString().split('T')[0],
          merchant: merchant,
          currency: settings.currency,
          confidence: 'high'
        });

        console.log('Found multiplier item:', fullDescription, '$' + totalAmount);
        foundItem = true;
      }

      // Try other item patterns
      if (!foundItem) {
        for (const pattern of itemPatterns) {
          const match = line.match(pattern);
          if (match) {
            const description = match[1].trim();
            const amount = parseFloat(match[2].replace(/,/g, ''));

            // Skip if this looks like a total or tax line
            if (/total|tax|subtotal|change|cash|card|credit|debit|balance|due/i.test(description.toLowerCase())) {
              continue;
            }

            // Skip very small amounts (likely not items) or very large amounts (likely totals)
            if (amount < 0.5 || amount > 1000) continue;

            // Detect category for this item
            let category = 'Other';
            const itemLower = description.toLowerCase();
            for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
              for (const keyword of keywords) {
                if (itemLower.includes(keyword)) {
                  category = cat;
                  break;
                }
              }
              if (category !== 'Other') break;
            }

            // Include merchant in description for better context
            const fullDescription = merchant ? `${merchant} - ${description}` : description;

            transactions.push({
              amount: amount,
              description: fullDescription,
              category: category,
              date: date || new Date().toISOString().split('T')[0],
              merchant: merchant,
              currency: settings.currency,
              confidence: 'medium'
            });

            console.log('Found item:', fullDescription, '$' + amount);
            foundItem = true;
            break;
          }
        }
      }

      // If no pattern matched, try the general price-at-end pattern
      if (!foundItem) {
        const match = line.match(priceAtEndPattern);
        if (match) {
          const description = match[1].trim();
          const amount = parseFloat(match[2].replace(/,/g, ''));

          // Skip if this looks like a total or tax line
          if (/total|tax|subtotal|change|cash|card|credit|debit|balance|due/i.test(description.toLowerCase())) {
            continue;
          }

          // Skip very small amounts (likely not items) or very large amounts (likely totals)
          if (amount < 0.5 || amount > 1000) continue;

          // Additional validation: description should be reasonable length and not just numbers
          if (description.length < 2 || description.length > 100 || /^\d+$/.test(description)) continue;

          // Detect category for this item
          let category = 'Other';
          const itemLower = description.toLowerCase();
          for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const keyword of keywords) {
              if (itemLower.includes(keyword)) {
                category = cat;
                break;
              }
            }
            if (category !== 'Other') break;
          }

          // Include merchant in description for better context
          const fullDescription = merchant ? `${merchant} - ${description}` : description;

          transactions.push({
            amount: amount,
            description: fullDescription,
            category: category,
            date: date || new Date().toISOString().split('T')[0],
            merchant: merchant,
            currency: settings.currency,
            confidence: 'low'
          });

          console.log('Found price-at-end item:', fullDescription, '$' + amount);
          foundItem = true;
        }
      }
    }

    console.log('Total transactions found:', transactions.length);
    console.log('Total amount detected:', totalAmount);

    // If no individual items were found but we have a total amount, create a single transaction
    if (transactions.length === 0 && totalAmount && totalAmount > 0) {
      // Detect category based on merchant/overall text
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

      transactions.push({
        amount: totalAmount,
        description: merchant || 'Scanned receipt',
        category: category,
        date: date || new Date().toISOString().split('T')[0],
        merchant: merchant,
        currency: settings.currency,
        confidence: 'high'
      });
    }

    return {
      transactions: transactions,
      rawText: text,
      totalAmount: totalAmount,
      merchant: merchant,
      date: date || new Date().toISOString().split('T')[0]
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

  // When scanResult is set, also set merchantOverride
  React.useEffect(() => {
    if (scanResult && scanResult.merchant) {
      setMerchantOverride(scanResult.merchant);
    }
  }, [scanResult]);

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
                <span className="badge bg-info">
                  {scanResult.transactions.length} item{scanResult.transactions.length !== 1 ? 's' : ''} found
                </span>
              </div>

              {/* Processing Mode Selection */}
              <div className="mb-3">
                <label className="form-label small">How to add transactions:</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    id="itemized"
                    name="processingMode"
                    checked={processingMode === 'itemized'}
                    onChange={() => setProcessingMode('itemized')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="itemized">
                    📦 Itemized (Individual Items)
                  </label>
                  <input
                    type="radio"
                    className="btn-check"
                    id="single"
                    name="processingMode"
                    checked={processingMode === 'single'}
                    onChange={() => setProcessingMode('single')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="single">
                    💰 Single Total
                  </label>
                </div>
                <small className="text-muted">
                  {processingMode === 'itemized'
                    ? 'Add each item as a separate transaction'
                    : 'Add the total amount as one transaction'}
                </small>
              </div>

              {/* Summary Info */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small">Merchant (editable)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={merchantOverride}
                    onChange={e => setMerchantOverride(e.target.value)}
                  />
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
              </div>

              {/* Individual Transactions */}
              <div className="mb-3">
                <h6 className="mb-2">
                  {processingMode === 'itemized' ? 'Items Found:' : 'Transaction Preview:'}
                </h6>
                <div className="border rounded p-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {processingMode === 'itemized' ? (
                    // Show all individual items
                    scanResult.transactions.map((transaction, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong className="small">{transaction.description}</strong>
                              <div className="text-muted small">{transaction.category}</div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold text-danger">
                                {settings.currencySymbol}{transaction.amount.toFixed(2)}
                              </div>
                              <span className={`badge ${transaction.confidence === 'high' ? 'bg-success' : transaction.confidence === 'medium' ? 'bg-warning' : 'bg-secondary'}`}>
                                {transaction.confidence}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Show single total transaction
                    <div className="d-flex justify-content-between align-items-center py-2">
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong className="small">
                              {scanResult.merchant ? `${scanResult.merchant} - Receipt Total` : 'Receipt Total'}
                            </strong>
                            <div className="text-muted small">Groceries</div>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold text-danger">
                              {settings.currencySymbol}{(scanResult.totalAmount || scanResult.transactions.reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                            </div>
                            <span className="badge bg-success">high</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total */}
                {scanResult.totalAmount && processingMode === 'itemized' && (
                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <strong>Total:</strong>
                    <strong className="text-danger">{settings.currencySymbol}{scanResult.totalAmount.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-danger flex-grow-1"
                  onClick={() => {
                    // Pass the merchant override to the parent
                    const resultWithOverride = {
                      ...scanResult,
                      merchant: merchantOverride,
                      transactions: scanResult.transactions.map(t => ({ ...t, merchant: merchantOverride, description: t.description.replace(scanResult.merchant, merchantOverride) }))
                    };
                    onScanComplete && onScanComplete(resultWithOverride, processingMode);
                  }}
                >
                  ✓ Add {processingMode === 'itemized' ?
                    `${scanResult.transactions.length} Transaction${scanResult.transactions.length !== 1 ? 's' : ''}` :
                    'Transaction'}
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
