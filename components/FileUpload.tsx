import React, { useRef } from 'react';
import { Upload, CheckCircle, Files } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  isUploaded: boolean;
  fileName?: string; // For single file
  fileCount?: number; // For multiple files
  maxFiles?: number;
  multiple?: boolean;
  onUpload: (files: FileList) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  isUploaded, 
  fileName, 
  fileCount,
  maxFiles,
  multiple = false,
  onUpload 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (maxFiles && e.target.files.length > maxFiles) {
        alert(`Bạn chỉ được tải lên tối đa ${maxFiles} tệp.`);
        return;
      }
      onUpload(e.target.files);
    }
  };

  return (
    <div className="relative group">
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 ${
          isUploaded
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isUploaded ? 'bg-green-200' : 'bg-slate-100 group-hover:bg-blue-50'}`}>
            {isUploaded ? <CheckCircle size={18} /> : (multiple ? <Files size={18} /> : <Upload size={18} />)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{label}</p>
            {multiple && fileCount ? (
              <p className="text-xs opacity-75">Đã tải: {fileCount} / {maxFiles} tệp</p>
            ) : fileName ? (
              <p className="text-xs opacity-75 truncate max-w-[150px]">{fileName}</p>
            ) : (
              <p className="text-xs opacity-50">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
        {!isUploaded && <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">XML</span>}
      </button>
    </div>
  );
};
