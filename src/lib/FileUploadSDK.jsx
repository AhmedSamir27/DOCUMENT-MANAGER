export class FileUploadSDK {
  static validateFile(file) {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!supportedTypes.includes(file.type)) {
      return { success: false, error: 'Unsupported file type' };
    }
    
    if (file.size > maxSize) {
      return { success: false, error: 'File size exceeds 50MB limit' };
    }
    
    return { success: true };
  }
  
  static async uploadFile(file, metadata) {
    const validation = this.validateFile(file);
    if (!validation.success) {
      return validation;
    }
    
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    return {
      success: true,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadDate: new Date().toISOString(),
      ...metadata
    };
  }
}
