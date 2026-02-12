import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { uploadDocument, deleteDocumentFile, getDocumentViewUrl, getDocumentDownloadUrl } from '../api/documentService';

const DOCUMENTS_KEY = 'documents_v1';

const DOCUMENT_TYPES = [
  { id: 'receipt', name: 'Receipt', icon: '🧾' },
  { id: 'warranty', name: 'Warranty', icon: '📋' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️' },
  { id: 'invoice', name: 'Invoice', icon: '📄' },
  { id: 'contract', name: 'Contract', icon: '📝' },
  { id: 'tax', name: 'Tax Document', icon: '📊' },
  { id: 'other', name: 'Other', icon: '📎' }
];

export default function DocumentStorage() {
  const { settings } = useSettings();
  const [documents, setDocuments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null); // For editing mode
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newDoc, setNewDoc] = useState({
    type: 'receipt',
    description: '',
    relatedTo: '',
    expiryDate: ''
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]');
      setDocuments(stored);
    } catch (e) {
      setDocuments([]);
    }
  };

  const saveDocuments = (docs) => {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
    setDocuments(docs);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check file sizes (max 50MB each)
    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        invalidFiles.push(file.name);
      } else {
        // Auto-detect document type from filename
        const lowerName = file.name.toLowerCase();
        let autoType = 'other';
        if (lowerName.includes('receipt') || lowerName.includes('bill')) autoType = 'receipt';
        else if (lowerName.includes('warranty')) autoType = 'warranty';
        else if (lowerName.includes('insurance')) autoType = 'insurance';
        else if (lowerName.includes('invoice')) autoType = 'invoice';
        else if (lowerName.includes('contract') || lowerName.includes('agreement')) autoType = 'contract';
        else if (lowerName.includes('tax') || lowerName.includes('w2') || lowerName.includes('1099')) autoType = 'tax';

        validFiles.push({
          file,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase()),
          type: autoType,
          size: file.size
        });
      }
    });

    if (invalidFiles.length > 0) {
      alert(`These files are too large (max 50MB):\n${invalidFiles.join('\n')}`);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index, newName) => {
    setSelectedFiles(prev => prev.map((f, i) => i === index ? { ...f, name: newName } : f));
  };

  const updateFileType = (index, newType) => {
    setSelectedFiles(prev => prev.map((f, i) => i === index ? { ...f, type: newType } : f));
  };

  const addDocuments = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length, fileName: '' });

    const newDocs = [];
    const errors = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileData = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length, fileName: fileData.file.name });

      try {
        const uploadResult = await uploadDocument(fileData.file);

        if (uploadResult.success) {
          newDocs.push({
            id: Date.now().toString() + '_' + i,
            name: fileData.name,
            type: fileData.type,
            description: newDoc.description,
            relatedTo: newDoc.relatedTo,
            expiryDate: newDoc.expiryDate,
            storedFileName: uploadResult.fileName,
            originalFileName: uploadResult.originalName,
            fileSize: uploadResult.size,
            createdAt: new Date().toISOString()
          });
        } else {
          errors.push(`${fileData.file.name}: ${uploadResult.error || 'Upload failed'}`);
        }
      } catch (error) {
        errors.push(`${fileData.file.name}: ${error.message}`);
      }
    }

    // Save all successful uploads
    if (newDocs.length > 0) {
      saveDocuments([...newDocs, ...documents]);
    }

    // Show errors if any
    if (errors.length > 0) {
      alert(`Some files failed to upload:\n${errors.join('\n')}`);
    }

    // Reset form
    setNewDoc({
      type: 'receipt',
      description: '',
      relatedTo: '',
      expiryDate: ''
    });
    setSelectedFiles([]);
    setUploadProgress({ current: 0, total: 0, fileName: '' });
    setUploading(false);

    if (newDocs.length > 0) {
      setShowAddForm(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm('Delete this document?')) return;

    const doc = documents.find(d => d.id === id);

    // Delete file from system storage if exists
    if (doc?.storedFileName) {
      try {
        await deleteDocumentFile(doc.storedFileName);
      } catch (error) {
        console.error('Error deleting file from storage:', error);
        // Continue to delete from list anyway
      }
    }

    saveDocuments(documents.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
    if (editingDoc?.id === id) setEditingDoc(null);
  };

  const startEditing = (doc) => {
    setEditingDoc({ ...doc });
  };

  const cancelEditing = () => {
    setEditingDoc(null);
  };

  const saveEditedDocument = () => {
    if (!editingDoc) return;

    const updatedDocs = documents.map(doc =>
      doc.id === editingDoc.id ? { ...editingDoc, updatedAt: new Date().toISOString() } : doc
    );

    saveDocuments(updatedDocs);
    setSelectedDoc(editingDoc);
    setEditingDoc(null);
  };

  const updateEditingField = (field, value) => {
    setEditingDoc(prev => ({ ...prev, [field]: value }));
  };

  const getDocType = (typeId) => {
    return DOCUMENT_TYPES.find(t => t.id === typeId) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    const type = doc.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  // Get count for each type
  const getTypeCount = (typeId) => {
    return documentsByType[typeId]?.length || 0;
  };

  // Filter documents based on selected category and search
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.relatedTo?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || doc.type === filterType;

    return matchesSearch && matchesType;
  });

  // Calculate storage usage - actual file sizes
  const metadataSize = JSON.stringify(documents).length;
  const totalFileSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">📎 Document Storage</h5>
          <small className="text-muted">
            {documents.length} document{documents.length !== 1 ? 's' : ''} • {formatFileSize(totalFileSize)} total
          </small>
        </div>
        <button
          className={`btn ${showAddForm ? 'btn-outline-secondary' : 'btn-danger'}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Document'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="mb-3">📄 Add Documents</h6>

            {/* Upload Progress Overlay */}
            {uploading && (
              <div className="mb-4 p-4 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
                <div className="spinner-border text-danger mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h6>Uploading... {uploadProgress.current} of {uploadProgress.total}</h6>
                <p className="text-muted mb-2">{uploadProgress.fileName}</p>
                <div className="progress" style={{ height: '10px' }}>
                  <div
                    className="progress-bar bg-danger"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {!uploading && (
              <div className="row g-3">
                {/* File Upload - Multiple */}
                <div className="col-12">
                  <label className="form-label small">📁 Select Files (multiple allowed, max 50MB each)</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFileSelect}
                    multiple
                  />
                  <small className="text-muted d-block mt-1">
                    Files are saved to: ~/budgetapp/documents/
                  </small>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="col-12">
                    <label className="form-label small">Selected Files ({selectedFiles.length})</label>
                    <div className="border rounded p-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {selectedFiles.map((fileData, index) => (
                        <div key={index} className="d-flex align-items-center gap-2 p-2 border-bottom">
                          <span style={{ fontSize: '20px' }}>
                            {DOCUMENT_TYPES.find(t => t.id === fileData.type)?.icon || '📎'}
                          </span>
                          <div className="flex-grow-1">
                            <input
                              type="text"
                              className="form-control form-control-sm mb-1"
                              value={fileData.name}
                              onChange={(e) => updateFileName(index, e.target.value)}
                              placeholder="Document name"
                            />
                            <div className="d-flex gap-2 align-items-center">
                              <select
                                className="form-select form-select-sm"
                                style={{ width: 'auto' }}
                                value={fileData.type}
                                onChange={(e) => updateFileType(index, e.target.value)}
                              >
                                {DOCUMENT_TYPES.map(t => (
                                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                                ))}
                              </select>
                              <small className="text-muted">
                                {(fileData.size / 1024).toFixed(1)}KB
                              </small>
                            </div>
                          </div>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeSelectedFile(index)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common fields for all files */}
                {selectedFiles.length > 0 && (
                  <>
                    <div className="col-md-4">
                      <label className="form-label small">Related To (applies to all)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Honda Accord 2022"
                        value={newDoc.relatedTo}
                        onChange={(e) => setNewDoc({ ...newDoc, relatedTo: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">Expiry Date (applies to all)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newDoc.expiryDate}
                        onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small">Description (applies to all)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Optional notes"
                        value={newDoc.description}
                        onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="col-12">
                  <button
                    className="btn btn-danger"
                    onClick={addDocuments}
                    disabled={selectedFiles.length === 0}
                  >
                    💾 Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Document${selectedFiles.length > 1 ? 's' : ''}` : 'Documents'}
                  </button>
                  {selectedFiles.length > 0 && (
                    <button
                      className="btn btn-outline-secondary ms-2"
                      onClick={() => setSelectedFiles([])}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="mb-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {/* All Documents Tab */}
          <button
            className={`btn ${filterType === 'all' ? 'btn-danger' : 'btn-outline-secondary'}`}
            onClick={() => setFilterType('all')}
          >
            📁 All
            <span className="badge ms-2" style={{ backgroundColor: filterType === 'all' ? '#ffffff' : 'var(--bg-secondary)', color: filterType === 'all' ? 'var(--accent-color)' : 'var(--text-primary)' }}>{documents.length}</span>
          </button>

          {/* Category Tabs - Only show if documents exist */}
          {DOCUMENT_TYPES.map(type => {
            const count = getTypeCount(type.id);
            if (count === 0) return null;
            return (
              <button
                key={type.id}
                className={`btn ${filterType === type.id ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setFilterType(type.id)}
              >
                {type.icon} {type.name}
                <span className="badge ms-2" style={{ backgroundColor: filterType === type.id ? '#ffffff' : 'var(--bg-secondary)', color: filterType === type.id ? 'var(--accent-color)' : 'var(--text-primary)' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search within category */}
        <div className="input-group">
          <span className="input-group-text">🔍</span>
          <input
            type="text"
            className="form-control"
            placeholder={`Search ${filterType === 'all' ? 'all documents' : getDocType(filterType).name + ' documents'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Header */}
      {filterType !== 'all' && (
        <div className="d-flex align-items-center gap-2 mb-3 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
          <span style={{ fontSize: '32px' }}>{getDocType(filterType).icon}</span>
          <div>
            <h5 className="mb-0">{getDocType(filterType).name} Documents</h5>
            <small className="text-muted">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </small>
          </div>
        </div>
      )}

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <span style={{ fontSize: '64px' }}>{filterType === 'all' ? '📂' : getDocType(filterType).icon}</span>
          <h5 className="mt-3">
            {searchQuery
              ? `No documents matching "${searchQuery}"`
              : filterType === 'all'
                ? 'No Documents'
                : `No ${getDocType(filterType).name} Documents`
            }
          </h5>
          <p>
            {filterType === 'all'
              ? 'Store receipts, warranties, insurance papers, and more'
              : `Add ${getDocType(filterType).name.toLowerCase()} documents to see them here`
            }
          </p>
          {filterType !== 'all' && (
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => setFilterType('all')}
            >
              View All Documents
            </button>
          )}
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-12">
            <div className="d-flex flex-column gap-2">
              {filteredDocs.map(doc => {
                const docType = getDocType(doc.type);
                const expired = isExpired(doc.expiryDate);
                const expiringSoon = isExpiringSoon(doc.expiryDate);

                return (
                  <div
                    key={doc.id}
                    className={`card ${selectedDoc?.id === doc.id ? 'border-danger' : ''} ${expired ? 'border-danger bg-danger bg-opacity-10' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <div className="card-body py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: '24px' }}>{docType.icon}</span>
                          <div>
                            <strong className="d-block">{doc.name}</strong>
                            <small className="text-muted">{doc.relatedTo || docType.name}</small>
                          </div>
                        </div>
                        <div className="text-end">
                          {(doc.storedFileName || doc.imageData) && <span className="badge" style={{ backgroundColor: 'var(--accent-color)', color: '#ffffff' }}>📎</span>}
                          {expired && <span className="badge ms-1" style={{ backgroundColor: 'var(--danger-color)', color: '#ffffff' }}>Expired</span>}
                          {expiringSoon && <span className="badge ms-1" style={{ backgroundColor: 'var(--warning-color)', color: '#000000' }}>Expiring Soon</span>}
                          <button
                            className="btn btn-link btn-sm p-0 ms-2"
                            style={{ color: 'var(--danger-color)' }}
                            onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setSelectedDoc(null); setEditingDoc(null); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', position: 'relative' }}>
              {/* Top Right Buttons */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }} className="d-flex align-items-center gap-2">
                {!editingDoc && (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => startEditing(selectedDoc)}
                  >
                    ✏️ Edit
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-2 py-1"
                  onClick={() => { setSelectedDoc(null); setEditingDoc(null); }}
                  style={{ lineHeight: 1, fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Header with Title */}
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)', paddingRight: '120px' }}>
                <h5 className="modal-title" style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                  {editingDoc ? '✏️ Edit Document' : selectedDoc.name}
                </h5>
              </div>
              <div className="modal-body" style={{ color: 'var(--text-primary)' }}>
                {/* File Preview - System Storage */}
                {selectedDoc.storedFileName && (
                  <div className="mb-3 text-center">
                    {selectedDoc.originalFileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={getDocumentViewUrl(selectedDoc.storedFileName)}
                        alt={selectedDoc.name}
                        className="img-fluid rounded border"
                        style={{ maxHeight: '300px', width: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="p-4 text-center border rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '48px' }}>📄</span>
                        <p className="mb-0" style={{ color: 'var(--text-primary)' }}>{selectedDoc.originalFileName}</p>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {selectedDoc.fileSize ? `${(selectedDoc.fileSize / 1024).toFixed(1)}KB` : ''}
                        </small>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy Base64 Preview */}
                {!selectedDoc.storedFileName && selectedDoc.imageData && (
                  <div className="mb-3 text-center">
                    {selectedDoc.imageData.startsWith('data:image') ? (
                      <img
                        src={selectedDoc.imageData}
                        alt={selectedDoc.name}
                        className="img-fluid rounded border"
                        style={{ maxHeight: '300px', width: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="p-4 text-center border rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '48px' }}>📄</span>
                        <p className="mb-0" style={{ color: 'var(--text-primary)' }}>{selectedDoc.fileName}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Mode */}
                {editingDoc ? (
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Document Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingDoc.name}
                        onChange={(e) => updateEditingField('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Type</label>
                      <select
                        className="form-select"
                        value={editingDoc.type}
                        onChange={(e) => updateEditingField('type', e.target.value)}
                      >
                        {DOCUMENT_TYPES.map(t => (
                          <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Related To</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Honda Accord 2022"
                        value={editingDoc.relatedTo || ''}
                        onChange={(e) => updateEditingField('relatedTo', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editingDoc.expiryDate || ''}
                        onChange={(e) => updateEditingField('expiryDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Optional notes"
                        value={editingDoc.description || ''}
                        onChange={(e) => updateEditingField('description', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{getDocType(selectedDoc.type).icon} {getDocType(selectedDoc.type).name}</span>
                    </div>
                    {selectedDoc.relatedTo && (
                      <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Related To:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{selectedDoc.relatedTo}</span>
                      </div>
                    )}
                    {selectedDoc.expiryDate && (
                      <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Expiry:</span>
                        <span style={{ color: isExpired(selectedDoc.expiryDate) ? 'var(--danger-color)' : 'var(--text-primary)', fontWeight: isExpired(selectedDoc.expiryDate) ? 'bold' : 'normal' }}>
                          {new Date(selectedDoc.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedDoc.description && (
                      <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Notes:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{selectedDoc.description}</span>
                      </div>
                    )}
                    {(selectedDoc.storedFileName || selectedDoc.originalFileName) && (
                      <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>File:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{selectedDoc.originalFileName || selectedDoc.fileName}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Added:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedDoc.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedDoc.updatedAt && (
                      <div className="d-flex justify-content-between p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Updated:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                {editingDoc ? (
                  <>
                    <button className="btn btn-outline-secondary" onClick={cancelEditing}>
                      Cancel
                    </button>
                    <button className="btn btn-danger" onClick={saveEditedDocument}>
                      💾 Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    {selectedDoc.storedFileName && (
                      <>
                        <a
                          href={getDocumentViewUrl(selectedDoc.storedFileName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary"
                        >
                          👁️ View
                        </a>
                        <a
                          href={getDocumentDownloadUrl(selectedDoc.storedFileName)}
                          download={selectedDoc.originalFileName || 'document'}
                          className="btn btn-danger"
                        >
                          📥 Download
                        </a>
                      </>
                    )}
                    {!selectedDoc.storedFileName && selectedDoc.imageData && (
                      <a
                        href={selectedDoc.imageData}
                        download={selectedDoc.fileName || 'document'}
                        className="btn btn-danger"
                      >
                        📥 Download
                      </a>
                    )}
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => { setSelectedDoc(null); setEditingDoc(null); }}
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Info */}
      <div className="mt-4 p-3 rounded border">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-muted">📁 Storage Location:</span>
          <code>~/budgetapp/documents/</code>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-muted">📄 Total Files:</span>
          <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-muted">💾 Total File Size:</span>
          <span className="fw-bold">{formatFileSize(totalFileSize)}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="text-muted">📋 Metadata Size:</span>
          <span>{formatFileSize(metadataSize)}</span>
        </div>
      </div>
    </div>
  );
}
