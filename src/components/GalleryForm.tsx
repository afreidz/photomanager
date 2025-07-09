import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Gallery } from '@/lib/db/schema';
import { useGalleryStore } from '@/hooks/useGalleryStore';

interface GalleryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gallery?: Gallery;
  onSuccess?: () => void;
}

export const GalleryForm = observer(function GalleryForm({ open, onOpenChange, gallery, onSuccess }: GalleryFormProps) {
  const galleryStore = useGalleryStore();
  const [formData, setFormData] = useState({
    name: gallery?.name || '',
    description: gallery?.description || '',
    isPublic: gallery?.isPublic || false,
    isFeatured: gallery?.isFeatured || false,
  });

  // Update form data when gallery prop changes (for editing)
  useEffect(() => {
    if (gallery) {
      setFormData({
        name: gallery.name,
        description: gallery.description || '',
        isPublic: gallery.isPublic,
        isFeatured: gallery.isFeatured,
      });
    } else {
      // Reset form for new gallery creation
      setFormData({
        name: '',
        description: '',
        isPublic: false,
        isFeatured: false,
      });
    }
  }, [gallery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const galleryData = {
        name: formData.name,
        description: formData.description,
        isPublic: formData.isPublic,
        isFeatured: formData.isFeatured,
      };

      if (gallery) {
        // Update existing gallery
        await galleryStore.updateGallery(gallery.id, galleryData);
      } else {
        // Create new gallery
        await galleryStore.createGallery(galleryData);
      }

      // Close dialog and call success callback
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form if creating new gallery
      if (!gallery) {
        setFormData({
          name: '',
          description: '',
          isPublic: false,
          isFeatured: false,
        });
      }
    } catch (error) {
      // Error handling is now done in the store
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {gallery ? 'Edit Gallery' : 'Create New Gallery'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Gallery Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter gallery name"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter gallery description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Gallery</Label>
                <div className="text-sm text-muted-foreground">
                  {formData.isFeatured 
                    ? "Required for featured galleries" 
                    : "Make this gallery visible to the public"
                  }
                </div>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                disabled={formData.isFeatured}
                onCheckedChange={(checked) => {
                  // Don't allow disabling public if featured is enabled
                  if (!formData.isFeatured || checked) {
                    setFormData(prev => ({ ...prev, isPublic: checked }))
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isFeatured">Featured Gallery</Label>
                <div className="text-sm text-muted-foreground">
                  Highlight this gallery on your site (must be public)
                </div>
              </div>
              <Switch
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    isFeatured: checked,
                    // Automatically enable public when featured is enabled
                    isPublic: checked ? true : prev.isPublic
                  }))
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={galleryStore.isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={galleryStore.isLoading}>
              {galleryStore.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {gallery ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                gallery ? 'Update Gallery' : 'Create Gallery'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
