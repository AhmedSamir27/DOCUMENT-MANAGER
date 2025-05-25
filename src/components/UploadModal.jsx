import React, { useState } from 'react';
import { X, Upload, FolderDown } from 'lucide-react';

export function UploadModal({ 
  show, 
  onClose, 
  uploadData, 
  setUploadData, 
  fileInputRef, 
  handleFileUpload,
  folders = [], 
  currentFolder 
}) {
  const [userIdError, setUserIdError] = useState('');

  if (!show) return null;

  const validateUserId = (id) => {
    if (!id) {
      setUserIdError('User ID is required');
      return false;
    }
    setUserIdError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateUserId(uploadData.userId)) {
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Upload Document</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={uploadData.userId || ''}
                onChange={(e) => {
                  setUploadData(prev => ({ ...prev, userId: e.target.value }));
                  setUserIdError('');
                }}
                className={`w-full px-3 py-2 border ${userIdError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Enter your unique user ID"
                required
              />
              {userIdError && (
                <p className="mt-1 text-sm text-red-500">{userIdError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Folder</label>
              <select
                value={uploadData.folderId || currentFolder || ''}
                onChange={(e) => setUploadData(prev => ({ ...prev, folderId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Root Folder</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Document title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Document description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input
                type="text"
                value={uploadData.tags}
                onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Comma-separated tags"
              />
            </div>
            
            <div>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    handleFileUpload(Array.from(e.target.files));
                  }
                }}
              />
              <button
                type="submit"
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Click to select files</p>
                <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, Images (up to 50MB)</p>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
