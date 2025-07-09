import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUpload } from '@/components/PhotoUpload';
import { getImageUrls } from '@/lib/image-client';
import { photoStore } from '@/stores/PhotoStore';
import { galleryStore } from '@/stores/GalleryStore';
import { actions } from 'astro:actions';
import { Trash2, Plus, Check } from 'lucide-react';

interface PhotoLibraryProps {
  cloudName?: string;
}

export const PhotoLibrary: React.FC<PhotoLibraryProps> = observer(({ cloudName: _ = 'your-cloud-name' }) => {
  const [search, setSearch] = useState('');
  const [openUpload, setOpenUpload] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkGalleryDialog, setShowBulkGalleryDialog] = useState(false);

  useEffect(() => {
    // Initialize photos on component mount
    photoStore.fetchPhotos();
  }, []);

  useEffect(() => {
    // Search photos when search term changes
    const timeoutId = setTimeout(() => {
      photoStore.searchPhotos(search);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleUploadSuccess = () => {
    // Refresh photos after successful upload
    photoStore.refresh();
  };

  const handlePhotoSelect = (photoId: string, selected: boolean) => {
    const newSelected = new Set(selectedPhotos);
    if (selected) {
      newSelected.add(photoId);
    } else {
      newSelected.delete(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === photoStore.photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photoStore.photos.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedPhotos.size} photo(s)? This action cannot be undone.`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const result = await actions.photos.bulkDelete({
        photoIds: Array.from(selectedPhotos)
      });

      if (result.data) {
        const { deleted, failed, total: _ } = result.data;
        if (failed.length > 0) {
          alert(`Deleted ${deleted.length} photos. Failed to delete ${failed.length} photos.`);
        } else {
          alert(`Successfully deleted ${deleted.length} photos.`);
        }
        
        // Refresh photos and clear selection
        photoStore.refresh();
        setSelectedPhotos(new Set());
        setIsSelectionMode(false);
      }
    } catch (error) {
      alert('Failed to delete photos. Please try again.');
      console.error('Bulk delete error:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAddToGallery = async (galleryId: string) => {
    if (selectedPhotos.size === 0) return;

    try {
      const result = await actions.photos.bulkAddToGallery({
        photoIds: Array.from(selectedPhotos),
        galleryId
      });

      if (result.data) {
        const { added, skipped, total: _ } = result.data;
        if (skipped > 0) {
          alert(`Added ${added} photos to gallery. ${skipped} photos were already in the gallery.`);
        } else {
          alert(`Successfully added ${added} photos to gallery.`);
        }
        
        setSelectedPhotos(new Set());
        setShowBulkGalleryDialog(false);
        setIsSelectionMode(false);
      }
    } catch (error) {
      alert('Failed to add photos to gallery. Please try again.');
      console.error('Bulk add to gallery error:', error);
    }
  };

  if (photoStore.isLoading && photoStore.photos.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading photos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Photo Library
            </h1>
            <p className="text-muted-foreground mt-1">
              {photoStore.photos.length} photos
            </p>
          </div>
          <Button onClick={() => setOpenUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Photos
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search photos..."
              className="w-64"
            />
            <Button 
              variant={isSelectionMode ? "secondary" : "outline"}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedPhotos(new Set());
              }}
            >
              {isSelectionMode ? 'Cancel Selection' : 'Select Photos'}
            </Button>
          </div>
        </div>

      {/* Bulk Operations Toolbar */}
      {isSelectionMode && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedPhotos.size === photoStore.photos.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedPhotos.size} of {photoStore.photos.length} selected
              </span>
            </div>
            
            {selectedPhotos.size > 0 && (
              <div className="flex items-center space-x-2">
                <Dialog open={showBulkGalleryDialog} onOpenChange={setShowBulkGalleryDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Gallery
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add {selectedPhotos.size} photos to gallery</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select onValueChange={handleBulkAddToGallery}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a gallery" />
                        </SelectTrigger>
                        <SelectContent>
                          {galleryStore.galleries.map((gallery) => (
                            <SelectItem key={gallery.id} value={gallery.id}>
                              {gallery.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

        {photoStore.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {photoStore.error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photoStore.photos.map((photo) => (
          <div key={photo.id} className={`group relative ${
            isSelectionMode ? 'cursor-pointer' : ''
          } ${
            selectedPhotos.has(photo.id) ? 'ring-2 ring-primary' : ''
          }`}>
            {isSelectionMode && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedPhotos.has(photo.id)}
                  onCheckedChange={(checked) => handlePhotoSelect(photo.id, checked as boolean)}
                  className="bg-white shadow-md"
                />
              </div>
            )}
            
            <img
              src={getImageUrls(photo.imageId).medium}
              alt={photo.title}
              className={`w-full h-full object-cover rounded-lg transition-opacity ${
                isSelectionMode && selectedPhotos.has(photo.id) ? 'opacity-75' : ''
              }`}
              onClick={() => {
                if (isSelectionMode) {
                  handlePhotoSelect(photo.id, !selectedPhotos.has(photo.id));
                }
              }}
            />
            
            {!isSelectionMode && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = `/photos/${photo.id}`}
                >
                  View Details
                </Button>
              </div>
            )}
            
            {selectedPhotos.has(photo.id) && (
              <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-xs truncate bg-black/50 px-2 py-1 rounded">
                {photo.title}
              </p>
            </div>
          </div>
        ))}
        </div>

        {photoStore.photos.length === 0 && !photoStore.isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No photos yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {search ? 'Try adjusting your search terms' : 'Upload your first photos to get started. You can organize them into galleries and manage them from here.'}
            </p>
          </div>
        )}

        {photoStore.pagination.hasMore && (
          <div className="flex justify-center mt-8">
            <Button 
              onClick={() => photoStore.loadMore()}
              disabled={photoStore.isLoading}
              variant="outline"
            >
              {photoStore.isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}

        <PhotoUpload open={openUpload} onOpenChange={setOpenUpload} onSuccess={handleUploadSuccess} />
      </div>
    </div>
  );
});

