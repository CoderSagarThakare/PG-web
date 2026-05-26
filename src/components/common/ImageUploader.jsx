import { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, Loader2, Plus, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ImageUploader({ 
  initialImages = [], 
  onChange, 
  uploadUrlApi, 
  maxImages = 10 
}) {
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);

  // Sync initial images from prop (existing images already uploaded)
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      // Map initial string array to local state object format
      // We only sync if the state is empty or if we are resetting the form
      setImages(prev => {
        // If we already have files that are uploading or newly added, don't overwrite them completely
        const hasUploadingOrNew = prev.some(img => img.status === 'uploading' || img.isNew);
        if (hasUploadingOrNew) return prev;
        
        return initialImages.map((url, idx) => ({
          id: `existing-${idx}-${url}`,
          url,
          key: url,
          status: 'success',
          isNew: false
        }));
      });
    } else {
      setImages(prev => {
        const hasUploadingOrNew = prev.some(img => img.status === 'uploading' || img.isNew);
        return hasUploadingOrNew ? prev : [];
      });
    }
  }, [initialImages]);

  // Notify parent on image list change
  const handleImagesChange = (updatedImages) => {
    // Only pass back the keys/urls of successfully uploaded images
    const activeImages = updatedImages
      .filter(img => img.status === 'success')
      .map(img => img.key || img.url);
    if (onChange) {
      onChange(activeImages);
    }
  };

  const uploadFile = async (item) => {
    try {
      const file = item.file;
      const { data } = await uploadUrlApi(file.name, file.type);
      const { uploadUrl, key } = data.data;

      // Direct S3 PUT Upload
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!response.ok) {
        throw new Error('S3 upload failed');
      }

      setImages(prev => {
        const updated = prev.map(img => {
          if (img.id === item.id) {
            return { ...img, status: 'success', key };
          }
          return img;
        });
        handleImagesChange(updated);
        return updated;
      });
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error(`Failed to upload ${item.file.name}`);
      
      setImages(prev => {
        const updated = prev.filter(img => img.id !== item.id);
        handleImagesChange(updated);
        return updated;
      });
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only upload up to ${maxImages} images. Only adding first ${remainingSlots} files.`);
    }

    const filesToUpload = files.slice(0, remainingSlots);

    const newItems = filesToUpload.map(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return null;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return null;
      }

      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        url: URL.createObjectURL(file),
        status: 'uploading',
        isNew: true
      };
    }).filter(Boolean);

    if (newItems.length === 0) return;

    setImages(prev => {
      const updated = [...prev, ...newItems];
      // Trigger upload for each new file asynchronously
      newItems.forEach(item => uploadFile(item));
      return updated;
    });
  };

  const removeImage = (id) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target && target.url && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      const updated = prev.filter(img => img.id !== id);
      handleImagesChange(updated);
      return updated;
    });
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Grid of Preview Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {images.map((img) => (
          <div 
            key={img.id} 
            className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] group flex items-center justify-center"
          >
            <img 
              src={img.url} 
              alt="PG showcase" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Status Overlay */}
            {img.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 z-10">
                <Loader2 className="animate-spin text-[#6c63ff] w-6 h-6" />
                <span className="text-[10px] text-white font-bold tracking-wider uppercase">Uploading...</span>
              </div>
            )}

            {/* Hover Actions */}
            {img.status !== 'uploading' && (
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-10">
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="w-8 h-8 rounded-lg bg-[#ff4d6d]/85 text-white flex items-center justify-center hover:bg-[#ff4d6d] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border-none"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={triggerFileSelect}
            className="relative aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2d3052] hover:border-[#6c63ff] bg-gray-50 dark:bg-[#242740]/30 hover:bg-[#6c63ff]/5 dark:hover:bg-[#6c63ff]/10 flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-[#a0a3b1] hover:text-[#6c63ff] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2d3052]/50 group-hover:bg-[#6c63ff]/15 flex items-center justify-center text-gray-400 dark:text-[#6b6e82] group-hover:text-[#6c63ff] transition-colors">
              <Plus size={16} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider">Add Image</span>
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*"
        className="hidden"
      />
      
      {/* Help text */}
      <p className="text-[11px] text-[#6b6e82] dark:text-[#6b6e82]">
        * Upload up to {maxImages} high-quality showcase images. JPEG, PNG, WEBP files under 5MB are supported.
      </p>
    </div>
  );
}
