import { FileText, Image, FileSpreadsheet, File } from 'lucide-react';
import React from 'react';

export const getFileIcon = (fileType) => {
  if (fileType?.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
  if (fileType?.includes('word')) return <FileText className="w-6 h-6 text-blue-500" />;
  if (fileType?.includes('excel') || fileType?.includes('sheet')) return <FileSpreadsheet className="w-6 h-6 text-green-500" />;
  if (fileType?.includes('image')) return <Image className="w-6 h-6 text-purple-500" />;
  return <File className="w-6 h-6 text-gray-500" />;
};
