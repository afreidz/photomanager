import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SortableList, SortableItem } from '@/components/ui/SortableList';
import { getImageUrls } from '@/lib/image-client';
import { actions } from 'astro:actions';
import { GripVertical, X, Plus, Search } from 'lucide-react';
import type { Gallery, Photo } from '@/lib/db/schema';

interface GalleryWithExtras extends Gallery {
  photoCount: number;
}

interface GalleryPhotoManagerProps {
  gallery: GalleryWithExtras;
  onPhotoRemoved?: () => void;
  cloudName?: string;
}

interface PhotoWithSort extends Photo {
  sortOrder: number;
}

export const GalleryPhotoManager: React.FC<GalleryPhotoManagerProps> = ({ gallery, onPhotoRemoved, cloudName: _ = 'your-cloud-name' }) => {
  const [photos, setPhotos] = useState<PhotoWithSort[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  // const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  // const [selectedAvailablePhotos, setSelectedAvailablePhotos] = useState<Set<string>>(new Set());
  // const [isSelectionMode, setIsSelectionMode] = useState(false);
  // const [isBulkRemoving, setIsBulkRemoving] = useState(false);

  // Fetch photos for this gallery
  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        const result = await actions.photos.getByGallery({ galleryId: gallery.id });
        if (result.data) {
          setPhotos(result.data.photos);
        }
      } catch (error) {
        console.error('Failed to fetch gallery photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryPhotos();
  }, [gallery.id]);

  // Fetch available photos when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      fetchAvailablePhotos();
    }
  }, [isAddDialogOpen, searchTerm]);

  const fetchAvailablePhotos = async () => {
    setIsLoadingAvailable(true);
    try {
      const result = await actions.photos.list({
        search: searchTerm || undefined,
        limit: 50
      });
      if (result.data) {
        // Filter out photos already in this gallery
        const galleryPhotoIds = new Set(photos.map(p => p.id));
        const available = result.data.photos.filter(photo => !galleryPhotoIds.has(photo.id));
        setAvailablePhotos(available);
      }
    } catch (error) {
      console.error('Failed to fetch available photos:', error);
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleReorder = (startIndex: number, endIndex: number) => {
    const newPhotos = [...photos];
    const [removed] = newPhotos.splice(startIndex, 1);
    newPhotos.splice(endIndex, 0, removed);
    
    // Update sort orders
    const updatedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      sortOrder: index
    }));
    
    setPhotos(updatedPhotos);
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const photoOrders = photos.map((photo, index) => ({
        photoId: photo.id,
        sortOrder: index
      }));

      const result = await actions.photos.reorderInGallery({
        galleryId: gallery.id,
        photoOrders
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Failed to save photo order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    try {
      const result = await actions.photos.removeFromGallery({
        photoId,
        galleryId: gallery.id
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Remove from local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      onPhotoRemoved?.();
    } catch (error) {
      console.error('Failed to remove photo from gallery:', error);
    }
  };

  const handleAddPhoto = async (photoId: string) => {
    try {
      const result = await actions.photos.addToGallery({
        photoId,
        galleryId: gallery.id
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Refresh gallery photos
      const galleryResult = await actions.photos.getByGallery({ galleryId: gallery.id });
      if (galleryResult.data) {
        setPhotos(galleryResult.data.photos);
      }

      // Remove from available photos
      setAvailablePhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Failed to add photo to gallery:', error);
    }
  };

  // const handlePhotoSelect = (photoId: string, selected: boolean) => {
  //   const newSelected = new Set(selectedPhotos);
  //   if (selected) {
  //     newSelected.add(photoId);
  //   } else {
  //     newSelected.delete(photoId);
  //   }
  //   setSelectedPhotos(newSelected);
  // };

  // const handleSelectAll = () => {
  //   if (selectedPhotos.size === photos.length) {
  //     setSelectedPhotos(new Set());
  //   } else {
  //     setSelectedPhotos(new Set(photos.map(p => p.id)));
  //   }
  // };

  // const handleBulkRemoveFromGallery = async () => {
  //   if (selectedPhotos.size === 0) return;
  //   
  //   if (!confirm(`Are you sure you want to remove ${selectedPhotos.size} photo(s) from this gallery?`)) {
  //     return;
  //   }

  //   setIsBulkRemoving(true);
  //   try {
  //     const result = await actions.photos.bulkRemoveFromGallery({
  //       photoIds: Array.from(selectedPhotos),
  //       galleryId: gallery.id
  //     });

  //     if (result.data) {
  //       alert(`Successfully removed ${result.data.removed} photos from gallery.`);
  //       
  //       // Refresh gallery photos and clear selection
  //       const galleryResult = await actions.photos.getByGallery({ galleryId: gallery.id });
  //       if (galleryResult.data) {
  //         setPhotos(galleryResult.data.photos);
  //       }
  //       setSelectedPhotos(new Set());
  //       setIsSelectionMode(false);
  //       onPhotoRemoved?.();
  //     }
  //   } catch (error) {
  //     alert('Failed to remove photos from gallery. Please try again.');
  //     console.error('Bulk remove from gallery error:', error);
  //   } finally {
  //     setIsBulkRemoving(false);
  //   }
  // };

  if (isLoading) {
    return (
      <>
        <div className="p-4">Loading photos...</div>
        {/* Single Add Photos Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl h-[80vh] !p-0 !gap-0 flex flex-col">
            <DialogHeader className="flex-shrink-0 p-6 pb-4">
              <DialogTitle>Add Photos to {gallery.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col flex-1 min-h-0 px-6">
              <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                {isLoadingAvailable ? (
                  <div className="text-center py-8">Loading photos...</div>
                ) : availablePhotos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No photos found matching your search.' : 'No available photos to add.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-6">
                    {availablePhotos.map((photo) => (
                      <div key={photo.id} className="group relative">
                        <img
                          src={getImageUrls(photo.imageId).medium}
                          alt={photo.title}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <Button
                            onClick={() => handleAddPhoto(photo.id)}
                            size="sm"
                            className="bg-white text-black hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                          <p className="text-white text-xs truncate">{photo.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (photos.length === 0) {
    return (
      <>
        <div className="p-4 text-center text-muted-foreground">
          <p>No photos in this gallery yet.</p>
          <p className="text-sm mt-2">Add photos from your library to get started.</p>
          <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        </div>
        {/* Single Add Photos Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl h-[80vh] !p-0 !gap-0 flex flex-col">
            <DialogHeader className="flex-shrink-0 p-6 pb-4">
              <DialogTitle>Add Photos to {gallery.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col flex-1 min-h-0 px-6">
              <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                {isLoadingAvailable ? (
                  <div className="text-center py-8">Loading photos...</div>
                ) : availablePhotos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No photos found matching your search.' : 'No available photos to add.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-6">
                    {availablePhotos.map((photo) => (
                      <div key={photo.id} className="group relative">
                        <img
                          src={getImageUrls(photo.imageId).medium}
                          alt={photo.title}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <Button
                            onClick={() => handleAddPhoto(photo.id)}
                            size="sm"
                            className="bg-white text-black hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                          <p className="text-white text-xs truncate">{photo.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Photos in {gallery.name}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
            <Button onClick={handleSaveOrder} disabled={isSaving} size="sm">
              {isSaving ? 'Saving...' : 'Save Order'}
            </Button>
          </div>
        </div>
        
        <SortableList onReorder={handleReorder}>
          {photos.map((photo) => (
            <SortableItem key={photo.id} id={photo.id}>
              <div className="flex items-center space-x-4">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                <img 
                  src={getImageUrls(photo.imageId).thumbnail} 
                  alt={photo.title} 
                  className="w-16 h-16 object-cover rounded" 
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => window.location.href = `/photos/${photo.id}`}>
                  <h3 className="text-base font-medium truncate">{photo.title}</h3>
                  {photo.description && (
                    <p className="text-sm text-muted-foreground truncate">{photo.description}</p>
                  )}
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemovePhoto(photo.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SortableItem>
          ))}
        </SortableList>
      </div>

      {/* Single Add Photos Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] !p-0 !gap-0 flex flex-col">
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <DialogTitle>Add Photos to {gallery.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 px-6">
            <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search photos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
              {isLoadingAvailable ? (
                <div className="text-center py-8">Loading photos...</div>
              ) : availablePhotos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No photos found matching your search.' : 'No available photos to add.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-6">
                  {availablePhotos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <img
                        src={getImageUrls(photo.imageId).medium}
                        alt={photo.title}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button
                          onClick={() => handleAddPhoto(photo.id)}
                          size="sm"
                          className="bg-white text-black hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                        <p className="text-white text-xs truncate">{photo.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

