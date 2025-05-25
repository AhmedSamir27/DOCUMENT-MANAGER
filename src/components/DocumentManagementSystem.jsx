import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  File, 
  Folder, 
  Search, 
  Trash2, 
  FolderPlus,
  Edit2,
  Shield,
  X,
  Trash
} from 'lucide-react';

import { FileUploadSDK } from '../lib/FileUploadSDK';
import { FolderManagementSDK } from '../lib/FolderManagementSDK';
import { TaggingLibrary } from '../lib/TaggingLibrary';
import { RBACLibrary } from '../lib/RBACLibrary';
import { getFileIcon } from '../utils/fileUtils.jsx';
import { UploadModal } from './UploadModal';
import { NewFolderModal } from './NewFolderModal';
import { EditFolderModal } from './EditFolderModal';
import { Notifications } from './Notifications';
import { DocumentDetails } from './DocumentDetails';
import { GlobalPermissionsModal } from './GlobalPermissionsModal';
import { EditDocumentModal } from './EditDocumentModal';

export default function DocumentManagementSystem() {
  const [documents, setDocuments] = useState(() => {
    const savedDocs = localStorage.getItem('documents');
    if (!savedDocs) return [];

    try {
      const parsed = JSON.parse(savedDocs);
      return parsed.map(doc => {
        // Convert the stored content back to ArrayBuffer if it's binary
        if (doc.content && !doc.fileType?.startsWith('text/')) {
          // Convert base64 string back to ArrayBuffer
          const binaryString = window.atob(doc.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          doc.content = bytes.buffer;
        }
        return {
          ...doc,
          acl: doc.acl || [] // Ensure ACL exists for each document
        };
      });
    } catch (error) {
      console.error('Error loading documents from localStorage:', error);
      return [];
    }
  });
  
  const [folders, setFolders] = useState(() => {
    const savedFolders = localStorage.getItem('folders');
    return savedFolders ? JSON.parse(savedFolders) : [];
  });
  
  const [currentFolder, setCurrentFolder] = useState(() => {
    const savedCurrentFolder = localStorage.getItem('currentFolder');
    return savedCurrentFolder ? JSON.parse(savedCurrentFolder) : null;
  });

  const [editingFolder, setEditingFolder] = useState(null);
  const [showEditFolder, setShowEditFolder] = useState(false);
  const [folderNameEdit, setFolderNameEdit] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showGlobalPermissions, setShowGlobalPermissions] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  // Upload form state
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    tags: '',
    userId: '',
    folderId: ''
  });

  // Folder form state
  const [folderName, setFolderName] = useState('');

  // For demo purposes, we'll use a mock current user
  const [currentUser] = useState('admin'); // Setting current user as admin
  const [userRole] = useState('admin'); // Setting user role as admin

  // Save to localStorage when data changes
  useEffect(() => {
    try {
      // Convert documents to a format that can be stored in localStorage
      const docsToStore = documents.map(doc => {
        const docToStore = { ...doc };
        // Handle binary content by converting to base64 string
        if (doc.content && !doc.fileType?.startsWith('text/')) {
          const bytes = new Uint8Array(doc.content);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          docToStore.content = window.btoa(binary);
        }
        return docToStore;
      });
      localStorage.setItem('documents', JSON.stringify(docsToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('currentFolder', JSON.stringify(currentFolder));
  }, [currentFolder]);

  // Add notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Handle delete document with permission check
  const handleDeleteDocument = (docId) => {
    const doc = documents.find(d => d.fileId === docId);
    if (!checkPermission(doc, 'admin')) {
      addNotification('You do not have permission to delete this document', 'error');
      return;
    }

    setDocuments(prev => prev.filter(doc => doc.fileId !== docId));
    addNotification('Document deleted successfully', 'success');
    setSelectedDocument(null);
  };

  // Check and notify permission
  const checkAndNotifyPermission = (document, requiredPermission) => {
    const hasPermission = checkPermission(document, requiredPermission);
    if (!hasPermission) {
      addNotification(`You need ${requiredPermission} permission to perform this action`, 'error');
    }
    return hasPermission;
  };

  // Utility function to check if the user is an admin
  const isAdmin = () => userRole === 'admin';

  // Check permission
  const checkPermission = (document, requiredPermission) => {
    // Admin has all permissions
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
  // Handle file upload with initial permissions
  const handleFileUpload = async (files) => {
    // Validate user ID
    if (!uploadData.userId) {
      addNotification('User ID is required', 'error');
      return;
    }

    // Check if user ID is unique
    const isUserIdUsed = documents.some(doc => doc.userId === uploadData.userId);
    if (isUserIdUsed) {
      addNotification('This User ID is already in use', 'error');
      return;
    }

    for (const file of files) {
      try {
        const metadata = {
          title: uploadData.title || file.name,
          description: uploadData.description,
          tags: uploadData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          folderId: uploadData.folderId || currentFolder,
          userId: uploadData.userId,
          acl: [
            {
              userId: currentUser,
              permissionLevel: 'admin',
              assignedAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            }
          ]
        };

        const result = await FileUploadSDK.uploadFile(file, metadata);
        
        if (result.success) {
          // Store file data in documents state, preserving the content
          const documentToStore = {
            ...result,
            content: result.content, // Make sure content is included
          };
          
          setDocuments(prev => [...prev, documentToStore]);
          addNotification(`File "${file.name}" uploaded successfully`, 'success');
        } else {
          addNotification(result.error, 'error');
        }
      } catch (error) {
        console.error('Upload error:', error);
        addNotification(`Failed to upload ${file.name}`, 'error');
      }
    }
      setShowUpload(false);
    setUploadData({ title: '', description: '', tags: '', userId: '', folderId: '' });
  };
  // Create new folder
  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    
    // Check if a folder with the same name already exists in the current directory
    const folderExists = folders.some(folder => 
      folder.parentId === currentFolder && 
      folder.name.toLowerCase() === folderName.trim().toLowerCase()
    );
    
    if (folderExists) {
      addNotification(`A folder with the name "${folderName}" already exists in this directory`, 'error');
      return;
    }
    
    const newFolder = FolderManagementSDK.createFolder(folderName, currentFolder);
    setFolders(prev => [...prev, newFolder]);
    addNotification(`Folder "${folderName}" created successfully`, 'success');
    setShowNewFolder(false);
    setFolderName('');
  };

  // Delete folder
  const handleDeleteFolder = (folderId) => {
    setFolders(prev => prev.filter(folder => folder.id !== folderId));
    addNotification('Folder deleted successfully', 'success');
  };

  // Add tags to document
  const handleAddTags = (docId, newTags) => {
    const tagsArray = newTags.split(',').map(tag => tag.trim()).filter(Boolean);
    setDocuments(prev => prev.map(doc => {
      if (doc.fileId === docId) {
        const result = TaggingLibrary.addTags(docId, [...(doc.tags || []), ...tagsArray]);
        return { ...doc, tags: result.tags };
      }
      return doc;
    }));
    addNotification('Tags added successfully', 'success');
  };
  // Handle edit folder
  const handleEditFolder = (folderId, newName) => {
    if (!newName.trim()) return;
    
    // Get the current folder being edited
    const folderToEdit = folders.find(folder => folder.id === folderId);
    if (!folderToEdit) return;
    
    // Check if new name is different from current name
    if (folderToEdit.name === newName.trim()) {
      setShowEditFolder(false);
      setEditingFolder(null);
      setFolderNameEdit('');
      return;
    }
    
    // Check if a folder with the same name already exists in the same parent directory
    const folderExists = folders.some(folder => 
      folder.id !== folderId && 
      folder.parentId === folderToEdit.parentId && 
      folder.name.toLowerCase() === newName.trim().toLowerCase()
    );
    
    if (folderExists) {
      addNotification(`A folder with the name "${newName}" already exists in this directory`, 'error');
      return;
    }

    const result = FolderManagementSDK.editFolder(folderId, newName);
    setFolders(prev => prev.map(folder => 
      folder.id === folderId ? { ...folder, name: newName, updatedAt: result.updatedAt } : folder
    ));
    addNotification(`Folder "${newName}" updated successfully`, 'success');
    setShowEditFolder(false);
    setEditingFolder(null);
    setFolderNameEdit('');
  };

  // Start editing a folder
  const startEditingFolder = (folder) => {
    setEditingFolder(folder);
    setFolderNameEdit(folder.name);
    setShowEditFolder(true);
  };  // Update document (for tags and other metadata)
  const handleUpdateDocument = (updatedDoc) => {
    try {
      // Check if user has edit permission
      if (!checkPermission(updatedDoc, 'edit')) {
        addNotification('You do not have permission to edit this document', 'error');
        return;
      }

      const newDocs = documents.map(doc => 
        doc.fileId === updatedDoc.fileId ? {
          ...doc,
          ...updatedDoc,
          tags: updatedDoc.tags || [],
          acl: updatedDoc.acl || doc.acl || [], // Preserve or update ACL
          updatedAt: new Date().toISOString()
        } : doc
      );
      
      setDocuments(newDocs);
      setSelectedDocument({
        ...updatedDoc,
        tags: updatedDoc.tags || [],
        acl: updatedDoc.acl || [],
        updatedAt: new Date().toISOString()
      });
      
      localStorage.setItem('documents', JSON.stringify(newDocs));
      addNotification('Document updated successfully', 'success');
    } catch (error) {
      console.error('Error updating document:', error);
      addNotification('Failed to update document', 'error');
    }
  };

  const filteredDocuments = documents.filter(doc => 
    (doc.folderId === currentFolder) &&
    (doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const filteredFolders = folders.filter(folder => 
    (folder.parentId === currentFolder) &&
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearStorage = () => {
    if (window.confirm('Are you sure you want to clear all documents and folders? This action cannot be undone.')) {
      setDocuments([]);
      setFolders([]);
      setCurrentFolder(null);
      setSelectedDocument(null);
      localStorage.removeItem('documents');
      localStorage.removeItem('folders');
      localStorage.removeItem('currentFolder');
      addNotification('All data has been cleared', 'info');
    }
  };

  // Add this new function to handle document clicks
  const handleDocumentClick = (doc) => {
    // Check if user has any permissions
    const hasAnyPermission = ['view', 'download', 'edit', 'admin'].some(permission => 
      checkPermission(doc, permission)
    );

    if (!hasAnyPermission) {
      addNotification("You don't have permission to view this document", 'error');
      return;
    }

    setSelectedDocument(doc);
  };

  // Handle folder clicks
  const handleFolderClick = (folder) => {
    if (!checkPermission(folder, 'view')) {
      addNotification("You don't have permission to access this folder", 'error');
      return;
    }
    
    setCurrentFolder(folder.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <File className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
                  {isAdmin() && (
                    <span className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">Organize, secure, and manage your files</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Clear Storage Button */}
              <button
                onClick={clearStorage}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Trash className="w-4 h-4" />
                <span>Clear Storage</span>
              </button>

              {/* Always show these buttons for admin */}
              {isAdmin() && (
                <>
                  <button
                    onClick={() => setShowGlobalPermissions(true)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Permissions</span>
                  </button>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={() => setShowNewFolder(true)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>New Folder</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents and folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <Notifications notifications={notifications} />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Breadcrumb */}              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <button
                    onClick={() => setCurrentFolder(null)}
                    className="hover:text-blue-600 transition-colors flex items-center"
                    title="Go to Home"
                  >
                    <Folder className="w-4 h-4 mr-1" />
                    Home
                  </button>
                  {currentFolder && (
                    <>
                      <span>/</span>
                      <div className="flex items-center">
                        <span className="text-gray-900 font-medium">
                          {folders.find(f => f.id === currentFolder)?.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          (Current folder)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Content Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Folders */}
                  {filteredFolders.map(folder => (                    <div
                      key={folder.id}
                      className={`group relative bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 ${
                        checkPermission(folder, 'view')
                          ? 'hover:shadow-md hover:from-yellow-100 hover:to-orange-100 hover:border-yellow-300 transition-all duration-200 cursor-pointer'
                          : 'opacity-75 cursor-not-allowed'
                      }`}
                      onClick={() => handleFolderClick(folder)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Folder className="w-8 h-8 text-yellow-600 group-hover:text-yellow-700" />
                          <div>
                            <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                            <p className="text-xs text-gray-500">Folder {checkPermission(folder, 'view') && <span className="text-blue-500">(Click to open)</span>}</p>
                          </div>
                        </div>
                        {checkPermission(folder, 'admin') && (
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingFolder(folder);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-all duration-200"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Documents */}
                  {filteredDocuments.map(doc => (
                    <div
                      key={doc.fileId}
                      className={`group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                        checkPermission(doc, 'view') || isAdmin()
                          ? 'hover:border-blue-300 cursor-pointer'
                          : 'opacity-75 cursor-not-allowed'
                      }`}
                      onClick={() => handleDocumentClick(doc)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {getFileIcon(doc.fileType)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                              {!['view', 'download', 'edit', 'admin'].some(permission => 
                                checkPermission(doc, permission)
                              ) && (
                                <Shield className="w-4 h-4 text-red-500" title="No access" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-xs text-gray-400">
                                {(doc.fileSize / 1024).toFixed(1)} KB
                              </p>
                              {doc.acl?.length > 0 && (
                                <span className="text-xs text-blue-600">
                                  {doc.acl.length} user{doc.acl.length !== 1 ? 's' : ''} with access
                                </span>
                              )}
                            </div>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {doc.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    {tag}
                                  </span>
                                ))}
                                {doc.tags.length > 2 && (
                                  <span className="text-xs text-gray-500">+{doc.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {checkPermission(doc, 'admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.fileId);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredDocuments.length === 0 && filteredFolders.length === 0 && (
                  <div className="text-center py-12">
                    <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm ? 'Try adjusting your search terms' : 'Upload your first document or create a folder'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Documents</span>
                  <span className="font-semibold text-blue-600">{documents.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Folders</span>
                  <span className="font-semibold text-green-600">{folders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Size</span>
                  <span className="font-semibold text-purple-600">
                    {(documents.reduce((total, doc) => total + doc.fileSize, 0) / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
            </div>

            {/* Document Details */}
            {selectedDocument && (              <DocumentDetails 
                document={selectedDocument} 
                onClose={() => setSelectedDocument(null)}
                onUpdateDocument={handleUpdateDocument}
                currentUser={currentUser}
                RBACLibrary={RBACLibrary}
                userRole={userRole}
                addNotification={addNotification}
                showEditModal={(doc) => setEditingDocument(doc)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add GlobalPermissionsModal */}      <GlobalPermissionsModal
        show={showGlobalPermissions}
        onClose={() => setShowGlobalPermissions(false)}
        documents={documents}
        onUpdateDocument={handleUpdateDocument}
        addNotification={addNotification}
      />      <UploadModal
        show={showUpload}
        onClose={() => setShowUpload(false)}
        uploadData={uploadData}
        setUploadData={setUploadData}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        folders={folders}
        currentFolder={currentFolder}
      />

      <NewFolderModal
        show={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        folderName={folderName}
        setFolderName={setFolderName}
        handleCreateFolder={handleCreateFolder}
      />      <EditFolderModal
        show={showEditFolder}
        onClose={() => {
          setShowEditFolder(false);
          setEditingFolder(null);
          setFolderNameEdit('');
        }}
        folderName={folderNameEdit}
        setFolderName={setFolderNameEdit}
        handleEditFolder={handleEditFolder}
        editingFolder={editingFolder}
      />

      <EditDocumentModal
        show={editingDocument !== null}
        onClose={() => setEditingDocument(null)}
        document={editingDocument}
        onUpdateDocument={(updatedDoc) => {
          handleUpdateDocument(updatedDoc);
          setEditingDocument(null);
        }}
      />
    </div>
  );
}
