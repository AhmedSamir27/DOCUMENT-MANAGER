import React, { useState } from 'react';
import { X, Shield, Search } from 'lucide-react';
import { RBACLibrary } from '../lib/RBACLibrary.js';

export function GlobalPermissionsModal({ show, onClose, documents, onUpdateDocument, addNotification }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  if (!show) return null;

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTogglePermission = (doc, permissionLevel) => {
    const result = RBACLibrary.assignPermissions(
      doc.fileId,
      `role_${permissionLevel}`, // Using role-based approach
      permissionLevel,
      doc.acl || []
    );

    if (result.success) {
      onUpdateDocument({
        ...doc,
        acl: result.acl
      });

      // Show appropriate notification based on whether permission was added or removed
      if (result.removed) {
        addNotification(`${permissionLevel.charAt(0).toUpperCase() + permissionLevel.slice(1)} permission removed from ${doc.title}`, 'info');
      } else {
        addNotification(`${permissionLevel.charAt(0).toUpperCase() + permissionLevel.slice(1)} permission added to ${doc.title}`, 'success');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Global Permissions Management</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 gap-4">
            {filteredDocuments.map(doc => (
              <div
                key={doc.fileId}
                className="border border-gray-200 rounded-lg p-4 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{doc.title}</h4>
                    <p className="text-sm text-gray-500">{doc.fileName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(selectedDoc?.fileId === doc.fileId ? null : doc)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {selectedDoc?.fileId === doc.fileId ? 'Close' : 'Manage Permissions'}
                  </button>
                </div>

                {selectedDoc?.fileId === doc.fileId && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    {/* Permission controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {RBACLibrary.validPermissions.map(perm => {
                        const hasPermission = (doc.acl || []).some(
                          entry => entry.permissionLevel === perm
                        );
                        return (
                          <button
                            key={perm}
                            onClick={() => handleTogglePermission(doc, perm)}
                            className={`px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                              hasPermission 
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                            <span>{perm.charAt(0).toUpperCase() + perm.slice(1)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active permissions summary */}
                    <div className="mt-4">
                      {(doc.acl || []).length > 0 ? (
                        <div className="text-sm text-gray-600">
                          Active permissions:
                          <div className="flex flex-wrap gap-2 mt-2">
                            {RBACLibrary.validPermissions.map(perm => {
                              const count = (doc.acl || []).filter(
                                entry => entry.permissionLevel === perm
                              ).length;
                              if (count > 0) {
                                return (
                                  <span
                                    key={perm}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {perm.charAt(0).toUpperCase() + perm.slice(1)}
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No permissions set
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredDocuments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No documents found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
