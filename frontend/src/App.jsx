import React, { useState } from 'react';
import { Upload, Download, Image as ImageIcon, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function SuperResolutionApp() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [upscaledUrl, setUpscaledUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const API_URL = 'http://localhost:5000';

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUpscaledUrl(null);
      setError(null);
    }
  };

  const handleUpscale = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/upscale`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upscaling failed');
      }

      setUpscaledUrl(data.image);
      setInfo({
        originalSize: data.original_size,
        upscaledSize: data.upscaled_size,
        scaleFactor: data.scale_factor
      });
    } catch (err) {
      setError(err.message || 'Failed to upscale image. Make sure the backend is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!upscaledUrl) return;

    const link = document.createElement('a');
    link.href = upscaledUrl;
    link.download = `upscaled_${selectedFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUpscaledUrl(null);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Super-Resolution</h1>
              <p className="text-gray-600">Enhance your images with deep learning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Image
          </h2>
          
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input').click()}
          >
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag & drop an image here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG (Max 2048px per dimension)
            </p>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFile && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Selected: {selectedFile.name}
              </span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {previewUrl && !upscaledUrl && (
          <div className="text-center mb-8">
            <button
              onClick={handleUpscale}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Upscale Image (2×)
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {(previewUrl || upscaledUrl) && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-6">Results</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original */}
              {previewUrl && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Original Image</h3>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={previewUrl} 
                      alt="Original" 
                      className="w-full h-auto"
                    />
                  </div>
                  {info && (
                    <p className="text-sm text-gray-500 mt-2">
                      {info.originalSize.width} × {info.originalSize.height} px
                    </p>
                  )}
                </div>
              )}

              {/* Upscaled */}
              {upscaledUrl && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Enhanced Image
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                      {info?.scaleFactor}× Larger
                    </span>
                  </h3>
                  <div className="border-2 border-green-300 rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={upscaledUrl} 
                      alt="Upscaled" 
                      className="w-full h-auto"
                    />
                  </div>
                  {info && (
                    <p className="text-sm text-gray-500 mt-2">
                      {info.upscaledSize.width} × {info.upscaledSize.height} px
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Download Button */}
            {upscaledUrl && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleDownload}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-green-600 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Enhanced Image
                </button>
                
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setUpscaledUrl(null);
                    setInfo(null);
                    setError(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Upload Another
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Powered</h3>
            <p className="text-gray-600 text-sm">
              Uses deep learning CNN with 16 residual blocks for superior quality
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">2× Resolution</h3>
            <p className="text-gray-600 text-sm">
              Doubles image dimensions while preserving quality and details
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Processing</h3>
            <p className="text-gray-600 text-sm">
              GPU-accelerated inference for quick results in seconds
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>Built with PyTorch + Flask + React</p>
        <p className="mt-1">Super-Resolution CNN with Encoder-Decoder Architecture</p>
      </div>
    </div>
  );
}