import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, X, Plus, Loader2 } from 'lucide-react';
import { actions } from 'astro:actions';

interface PhotoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  galleryId?: string;
}

interface PhotoPreview {
  file: File;
  preview: string;
  title: string;
  description: string;
  tags: string[];
}

export function PhotoUpload({ open, onOpenChange, onSuccess, galleryId }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      description: '',
      tags: [],
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updatePhoto = (index: number, updates: Partial<PhotoPreview>) => {
    setPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, ...updates } : photo
    ));
  };

  const addTag = (photoIndex: number, tag: string) => {
    if (!tag.trim()) return;
    updatePhoto(photoIndex, {
      tags: [...photos[photoIndex].tags, tag.trim()]
    });
  };

  const removeTag = (photoIndex: number, tagIndex: number) => {
    updatePhoto(photoIndex, {
      tags: photos[photoIndex].tags.filter((_, i) => i !== tagIndex)
    });
  };

  const handleUpload = async () => {
    if (photos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        // Upload and process the photo using filesystem
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('title', photo.title);
        formData.append('description', photo.description);
        if (galleryId) formData.append('galleryId', galleryId);
        
        // Add tags to FormData
        photo.tags.forEach(tag => {
          formData.append('tags', tag);
        });
        
        const result = await actions.photos.upload(formData);
        
        if (result.error) {
          throw new Error(result.error.message);
        }

        setUploadProgress(((i + 1) / photos.length) * 100);
      }

      // Clean up previews
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
      setPhotos([]);
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Upload error:', error);
      // You might want to show an error toast here
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    
    // Clean up previews
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop photos here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports JPEG, PNG, GIF, WebP up to 5MB each
                </p>
              </div>
            )}
          </div>

          {/* Photo Previews */}
          {photos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Photos to Upload ({photos.length})</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {photos.map((photo, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex gap-4">
                      {/* Preview Image */}
                      <div className="relative">
                        <img
                          src={photo.preview}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Photo Details */}
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`title-${index}`}>Title</Label>
                            <Input
                              id={`title-${index}`}
                              value={photo.title}
                              onChange={(e) => updatePhoto(index, { title: e.target.value })}
                              placeholder="Photo title"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`description-${index}`}>Description</Label>
                            <Textarea
                              id={`description-${index}`}
                              value={photo.description}
                              onChange={(e) => updatePhoto(index, { description: e.target.value })}
                              placeholder="Photo description (optional)"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <Label>Tags</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {photo.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-1"
                                  onClick={() => removeTag(index, tagIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add tag"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const input = e.target as HTMLInputElement;
                                  addTag(index, input.value);
                                  input.value = '';
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                const input = (e.target as HTMLElement)
                                  .parentElement?.querySelector('input') as HTMLInputElement;
                                if (input) {
                                  addTag(index, input.value);
                                  input.value = '';
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={photos.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
