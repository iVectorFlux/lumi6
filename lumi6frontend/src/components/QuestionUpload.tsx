import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface QuestionUploadProps {
  type: 'proficiency' | 'eq';
  onUploadComplete?: (result: any) => void;
}

interface UploadResult {
  message: string;
  imported: number;
  errors?: Array<{
    row: number;
    error: string | any[];
  }>;
}

const QuestionUpload: React.FC<QuestionUploadProps> = ({ type, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a CSV or Excel file');
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return false;
    }
    
    return true;
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/question-upload/templates/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}_questions_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template');
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/question-upload/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result.data);
        if (onUploadComplete) {
          onUploadComplete(result.data);
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        message: error instanceof Error ? error.message : 'Upload failed',
        imported: 0,
        errors: [{ row: 0, error: 'Upload failed' }]
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
  };

  const getTypeDisplayName = () => {
    return type === 'proficiency' ? 'Proficiency' : 'EQ';
  };

  const getSampleFields = () => {
    if (type === 'proficiency') {
      return [
        'text', 'type', 'category', 'difficulty', 'options', 
        'correctAnswer', 'score', 'mediaUrl', 'mediaAudio', 'mediaImage'
      ];
    } else {
      return [
        'text', 'type', 'module', 'submodule', 'category', 'difficulty',
        'options', 'correctAnswer', 'normalizedScore', 'weight', 'scoring',
        'mediaUrl', 'isActive', 'inconsistencyPairId', 'isReversed'
      ];
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload {getTypeDisplayName()} Questions
          </CardTitle>
          <CardDescription>
            Bulk upload questions using CSV or Excel files. Download the template to see the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium text-blue-900">Download Template</h4>
              <p className="text-sm text-blue-700">
                Get the CSV template with sample {getTypeDisplayName().toLowerCase()} questions
              </p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Required Fields Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Required Fields</h4>
            <div className="flex flex-wrap gap-1">
              {getSampleFields().map((field) => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button onClick={resetUpload} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-lg font-medium">Drop your file here</p>
                <p className="text-gray-500">or click to browse</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {file && (
            <Button
              onClick={uploadFile}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Questions
                </>
              )}
            </Button>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-center text-gray-600">
                Processing your file...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.imported > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={uploadResult.imported > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                {uploadResult.message}
              </AlertDescription>
            </Alert>

            {uploadResult.imported > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="font-medium text-green-900">
                  ✅ Successfully imported {uploadResult.imported} questions
                </p>
              </div>
            )}

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-900">Errors Found:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {uploadResult.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded text-sm">
                      <span className="font-medium">Row {error.row}:</span>{' '}
                      {typeof error.error === 'string' 
                        ? error.error 
                        : JSON.stringify(error.error)
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={resetUpload} variant="outline" className="w-full">
              Upload Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuestionUpload; 