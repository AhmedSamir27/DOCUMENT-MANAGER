import React, { useState, useEffect } from 'react';
import { X, Eye, Download, Plus, Tag, Edit2, Save, XCircle, Copy, Shield } from 'lucide-react';
import { TaggingLibrary } from '../lib/TaggingLibrary.js';

export function DocumentDetails({ 
  document, 
  onClose, 
  onUpdateDocument, 
  currentUser = 'admin',
  RBACLibrary,
  userRole = 'admin',
  addNotification,
  showEditModal // Add this prop
}) {
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [editedTagValue, setEditedTagValue] = useState('');
  const [error, setError] = useState('');
  const [tags, setTags] = useState([]);

  // Utility function to check if the user is an admin
  const isAdmin = () => userRole === 'admin';

  // Check permission
  const checkPermission = (document, requiredPermission) => {
    if (isAdmin()) return true;
    if (!document) return false;
    const result = RBACLibrary.hasPermission(
      document.fileId,
      currentUser,
      requiredPermission,
      document.acl || []
    );
    return result.hasPermission;
  };

  // Get user permissions for the current document
  const getUserPermissions = () => {
    if (isAdmin()) return ['view', 'download', 'edit', 'admin'];
    if (!document) return [];
    
    const permissions = [];
    ['view', 'download', 'edit'].forEach(perm => {
      if (checkPermission(document, perm)) {
        permissions.push(perm);
      }
    });
    return permissions;
  };

  // Sync tags with document when it changes
  useEffect(() => {
    if (document) {
      setTags(document.tags || []);
    }
  }, [document]);

  const canEdit = () => checkPermission(document, 'edit') || isAdmin();

  const handleAddTag = (e) => {
    e.preventDefault();
    if (!canEdit()) {
      addNotification('You do not have permission to edit tags', 'error');
      return;
    }

    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;

    const result = TaggingLibrary.addTags(document.fileId, [trimmedTag], tags);
    if (result.success) {
      updateTags(result.tags);
      setNewTag('');
      setError('');
    } else {
      setError(result.error);
    }
  };
  const handleRemoveTag = (tagToRemove, e) => {
    e.stopPropagation();
    if (!canEdit()) {
      addNotification('You do not have permission to remove tags', 'error');
      return;
    }

    const result = TaggingLibrary.removeTags(document.fileId, [tagToRemove], tags);
    if (result.success) {
      updateTags(result.tags);
    }
  };

  const handleEditTag = (oldTag) => {
    if (!canEdit()) {
      addNotification('You do not have permission to edit tags', 'error');
      setEditingTag(null);
      return;
    }

    const trimmedTag = editedTagValue.trim();
    // If the tag hasn't changed, just close the edit mode
    if (trimmedTag === oldTag) {
      setEditingTag(null);
      setError('');
      return;
    }

    const result = TaggingLibrary.editTag(document.fileId, oldTag, trimmedTag, tags);
    if (result.success) {
      updateTags(result.tags);
      setEditingTag(null);
      setEditedTagValue('');
      setError('');
    } else {
      setError(result.error || 'Failed to edit tag');
    }
  };  const updateTags = (newTags) => {
    // Ensure we have valid tags array
    const validTags = Array.isArray(newTags) ? newTags : [];
    
    setTags(validTags);
    onUpdateDocument({
      ...document,
      tags: validTags,
      updatedAt: new Date().toISOString()
    });
  };
  const handleDownload = () => {
    if (!checkPermission(document, 'download')) {
      addNotification('You do not have permission to download this document', 'error');
      return;
    }

    try {
      let mimeType = 'application/octet-stream';
      let fileExtension = '.txt';
      
      // Set the appropriate mime type based on document type
      if (document.fileType) {
        mimeType = document.fileType; // Use the actual file type
        
        // Set file extension based on mime type
        if (document.fileType.includes('pdf')) {
          fileExtension = '.pdf';
        } else if (document.fileType.includes('word')) {
          fileExtension = document.fileType.includes('openxmlformats') ? '.docx' : '.doc';
        } else if (document.fileType.includes('excel')) {
          fileExtension = document.fileType.includes('openxmlformats') ? '.xlsx' : '.xls';
        } else if (document.fileType.includes('image')) {
          fileExtension = document.fileType.includes('png') ? '.png' : 
                         document.fileType.includes('gif') ? '.gif' : '.jpg';
        }
      }

      let blob;
      const content = document.content;

      // Handle binary vs text content appropriately
      if (typeof content === 'string') {
        // Text content
        blob = new Blob([content], { type: mimeType });
      } else if (content instanceof ArrayBuffer) {
        // Binary content
        blob = new Blob([content], { type: mimeType });
      } else if (!content) {
        // Fallback for documents without content
        addNotification('No content available for download', 'error');
        return;
      }

      // Create download URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName || `${document.title}${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addNotification('Download started successfully', 'success');
    } catch (error) {
      console.error('Download error:', error);
      addNotification('Failed to download the document', 'error');
    }
  };

  const copyToClipboard= async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification('Copied to clipboard', 'success');
    } catch (err) {
      addNotification('Failed to copy to clipboard', 'error');
    }
  };

  if (!document) return null;

  const userPermissions = getUserPermissions();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Document Details</h3>
          {userPermissions.length > 0 && (
            <div className="flex space-x-1">
              {userPermissions.map(perm => (
                <span
                  key={perm}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                >
                  {perm.charAt(0).toUpperCase() + perm.slice(1)}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Document info section - always visible */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document ID</label>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-900 font-mono">{document.fileId}</p>
            <button
              onClick={() => copyToClipboard(document.fileId)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <p className="text-sm text-gray-900">{document.title}</p>
        </div>
        
        {document.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-sm text-gray-600">{document.description}</p>
          </div>
        )}

        {/* Tags section - view-only for non-edit users */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <Tag className="w-4 h-4 text-gray-400" />
          </div>

          {canEdit() && (
            <form onSubmit={handleAddTag} className="mb-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setError('');
                  }}
                  placeholder="Add a tag"
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <div
                key={tag}
                className="group relative flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {editingTag === tag && canEdit() ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={editedTagValue}
                      onChange={(e) => {
                        setEditedTagValue(e.target.value);
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEditTag(tag);
                        } else if (e.key === 'Escape') {
                          setEditingTag(null);
                          setError('');
                        }
                      }}
                      className="w-24 px-1 py-0.5 text-xs border border-blue-300 rounded"
                      autoFocus
                    />
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditTag(tag)}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTag(null);
                          setError('');
                        }}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span>{tag}</span>
                    {canEdit() && (
                      <div className="hidden group-hover:flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => {
                            setEditingTag(tag);
                            setEditedTagValue(tag);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleRemoveTag(tag, e)}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {tags.length === 0 && (
              <span className="text-sm text-gray-500">No tags</span>
            )}
          </div>
        </div>

        {/* Action buttons based on permissions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {checkPermission(document, 'view') && (
              <button 
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                onClick={() => {
                  addNotification(`Opening document: ${document.title}`, 'info');
                }}
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
            )}
              {checkPermission(document, 'download') && (
              <button 
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
              {checkPermission(document, 'edit') && (
              <button 
                className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-1"
                onClick={() => showEditModal(document)}
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
