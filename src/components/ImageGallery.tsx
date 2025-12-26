import React, { useState, useEffect } from 'react';
import { X, ZoomIn, Download, Trash2 } from 'lucide-react';

interface SavedImage {
  id: string;
  url: string;
  prompt: string;
  type: string;
  aspectRatio: string;
  timestamp: number;
}

interface ImageGalleryProps {
  onSelectImage?: (url: string) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ onSelectImage }) => {
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null);
  const [searchQuery] = useState('');

  // Load saved images from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('generatedImages');
    if (saved) {
      try {
        const images = JSON.parse(saved);
        setSavedImages(images);
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }
  }, []);

  // Save images to localStorage whenever savedImages changes
  useEffect(() => {
    if (savedImages.length > 0) {
      localStorage.setItem('generatedImages', JSON.stringify(savedImages));
    }
  }, [savedImages]);

  const deleteImage = (id: string) => {
    setSavedImages(prev => prev.filter(img => img.id !== id));
  };

  const filteredImages = savedImages.filter(img =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className="group relative bg-card rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <div className="aspect-square bg-muted">
              <img
                src={image.url}
                alt={image.prompt}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-xs truncate">{image.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-foreground">{image.type}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(image.id);
                    }}
                    className="p-1 bg-red-500 hover:bg-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No images match your search' : 'No saved images yet'}
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl max-h-full flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-lg font-semibold truncate max-w-md">
                  {selectedImage.prompt}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-primary rounded">
                    {selectedImage.type}
                  </span>
                  <span className="text-xs px-2 py-1 bg-muted text-foreground rounded">
                    {selectedImage.aspectRatio}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedImage.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 bg-card hover:bg-muted text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center overflow-auto">
              <img
                src={selectedImage.url}
                alt={selectedImage.prompt}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedImage.url;
                  link.download = `image-${selectedImage.id}.png`;
                  link.click();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              {onSelectImage && (
                <button
                  onClick={() => {
                    onSelectImage(selectedImage.url);
                    setSelectedImage(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                  Use This Image
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGallery;
