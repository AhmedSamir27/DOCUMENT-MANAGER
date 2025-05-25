import React, { useState } from 'react';
import { X, Shield, Plus, Trash2 } from 'lucide-react';
import { RBACLibrary } from '../lib/RBACLibrary.js';

export function PermissionsModal({ show, onClose, document, acl, onUpdateAcl }) {
  const [newUserId, setNewUserId] = useState('');
  const [newPermission, setNewPermission] = useState('view');
  const [error, setError] = useState('');

  if (!show) return null;

  const handleAddPermission = () => {
    if (!newUserId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    const result = RBACLibrary.assignPermissions(
      document.fileId,
      newUserId.trim(),
      newPermission,
      acl
    );

    if (result.success) {
      onUpdateAcl(result.acl);
      setNewUserId('');
      setNewPermission('view');
      setError('');
    } else {
      setError(result.error);
    }
  };

  const handleRemovePermission = (userId) => {
    const result = RBACLibrary.removePermissions(document.fileId, userId, acl);
    if (result.success) {
      onUpdateAcl(result.acl);
    }
  };

  const handleUpdatePermission = (userId, newPermissionLevel) => {
    const result = RBACLibrary.assignPermissions(
      document.fileId,
      userId,
      newPermissionLevel,
      acl
    );

    if (result.success) {
      onUpdateAcl(result.acl);
    }
  };

  const documentAcl = RBACLibrary.getAllUsersWithAccess(document.fileId, acl).users;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Manage Permissions</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Add new permission */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Add User Permission</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => {
                    setNewUserId(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter user ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newPermission}
                  onChange={(e) => setNewPermission(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {RBACLibrary.validPermissions.map(perm => (
                    <option key={perm} value={perm}>
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddPermission}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* Current permissions list */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Current Permissions</h4>
              <div className="space-y-2">
                {documentAcl.length > 0 ? (
                  documentAcl.map(({ userId, permissionLevel, assignedAt }) => (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{userId}</p>
                        <p className="text-xs text-gray-500">
                          Added {new Date(assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={permissionLevel}
                          onChange={(e) => handleUpdatePermission(userId, e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {RBACLibrary.validPermissions.map(perm => (
                            <option key={perm} value={perm}>
                              {perm.charAt(0).toUpperCase() + perm.slice(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemovePermission(userId)}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No permissions set
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
