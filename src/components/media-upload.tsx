'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadServiceMedia, deleteServiceMedia, validateFile, getMediaType } from '@/lib/supabase/storage';
import { Button } from '@/components/ui/button';
import { ImagePlus, Film, X, Loader2 } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaUploadProps {
  userId: string;
  images: string[];
  videos: string[];
  onImagesChange: (urls: string[]) => void;
  onVideosChange: (urls: string[]) => void;
  maxImages?: number;
  maxVideos?: number;
}

export function MediaUpload({
  userId,
  images,
  videos,
  onImagesChange,
  onVideosChange,
  maxImages = 5,
  maxVideos = 2,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allMedia: MediaItem[] = [
    ...images.map((url) => ({ url, type: 'image' as const })),
    ...videos.map((url) => ({ url, type: 'video' as const })),
  ];

  const canAddImages = images.length < maxImages;
  const canAddVideos = videos.length < maxVideos;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        const mediaType = getMediaType(file);
        if (mediaType === 'image' && images.length >= maxImages) {
          setError(`Maximo ${maxImages} imagenes permitidas.`);
          return;
        }
        if (mediaType === 'video' && videos.length >= maxVideos) {
          setError(`Maximo ${maxVideos} videos permitidos.`);
          return;
        }
      }

      setUploading(true);
      try {
        let currentImages = [...images];
        let currentVideos = [...videos];
        for (const file of fileArray) {
          const mediaType = getMediaType(file)!;
          const url = await uploadServiceMedia(userId, file);

          if (mediaType === 'image') {
            currentImages = [...currentImages, url];
            onImagesChange(currentImages);
          } else {
            currentVideos = [...currentVideos, url];
            onVideosChange(currentVideos);
          }
        }
      } catch {
        setError('Error subiendo archivo. Intenta de nuevo.');
      } finally {
        setUploading(false);
      }
    },
    [userId, images, videos, maxImages, maxVideos, onImagesChange, onVideosChange],
  );

  const handleRemove = async (item: MediaItem) => {
    try {
      await deleteServiceMedia(item.url);
    } catch {
      // continue removing from state even if storage delete fails
    }
    if (item.type === 'image') {
      onImagesChange(images.filter((u) => u !== item.url));
    } else {
      onVideosChange(videos.filter((u) => u !== item.url));
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <ImagePlus className="h-4 w-4" />
          {images.length}/{maxImages} imagenes
        </span>
        <span className="flex items-center gap-1">
          <Film className="h-4 w-4" />
          {videos.length}/{maxVideos} videos
        </span>
      </div>

      {/* Preview grid */}
      {allMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allMedia.map((item) => (
            <div key={item.url} className="relative group rounded-lg overflow-hidden border bg-muted aspect-video">
              {item.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <video src={item.url} className="w-full h-full object-cover" muted />
              )}
              <div className="absolute top-1 right-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(item)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {item.type === 'video' && (
                <div className="absolute bottom-1 left-1">
                  <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">VIDEO</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {(canAddImages || canAddVideos) && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Subiendo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {canAddImages && <ImagePlus className="h-8 w-8 text-muted-foreground" />}
                {canAddVideos && <Film className="h-8 w-8 text-muted-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground">
                Arrastra archivos aqui o haz click para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP (max 5MB) · MP4, MOV, WebM (max 50MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
