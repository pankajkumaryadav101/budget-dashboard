const API_BASE = 'http://localhost:8080/api/documents';

/**
 * Upload a document to the server
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - Upload result with fileName
 */
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
};

/**
 * Download a document from the server
 * @param {string} fileName - The stored filename
 * @returns {Promise<Blob>} - The file as a Blob
 */
export const downloadDocument = async (fileName) => {
  const response = await fetch(`${API_BASE}/download/${encodeURIComponent(fileName)}`);

  if (!response.ok) {
    throw new Error('Download failed');
  }

  return response.blob();
};

/**
 * Get the URL to view a document inline
 * @param {string} fileName - The stored filename
 * @returns {string} - The view URL
 */
export const getDocumentViewUrl = (fileName) => {
  return `${API_BASE}/view/${encodeURIComponent(fileName)}`;
};

/**
 * Get the URL to download a document
 * @param {string} fileName - The stored filename
 * @returns {string} - The download URL
 */
export const getDocumentDownloadUrl = (fileName) => {
  return `${API_BASE}/download/${encodeURIComponent(fileName)}`;
};

/**
 * Delete a document from the server
 * @param {string} fileName - The stored filename
 * @returns {Promise<Object>} - Delete result
 */
export const deleteDocumentFile = async (fileName) => {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Delete failed');
  }

  return response.json();
};

/**
 * Get storage information
 * @returns {Promise<Object>} - Storage info
 */
export const getStorageInfo = async () => {
  const response = await fetch(`${API_BASE}/storage-info`);
  return response.json();
};
