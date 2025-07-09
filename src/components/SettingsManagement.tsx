import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { actions } from 'astro:actions';

interface ImageSizeConfig {
  width: number;
  height: number;
  quality: number;
  isCustom?: boolean;
}

interface FormData {
  name: string;
  width: string;
  height: string;
  quality: string;
  processExisting: boolean;
}

interface DeleteData {
  sizeName: string;
  deleteExistingImages: boolean;
}

interface FormErrors {
  name?: string;
  width?: string;
  height?: string;
  quality?: string;
}

export const SettingsManagement = observer(function SettingsManagement() {
  const [imageSizes, setImageSizes] = useState<[string, ImageSizeConfig][]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    width: '',
    height: '',
    quality: '',
    processExisting: false
  });
  const [deleteData, setDeleteData] = useState<DeleteData>({
    sizeName: '',
    deleteExistingImages: false
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await actions.settings.getImageSizes({});
        if (result.data) {
          setImageSizes(Object.entries(result.data.sizes));
        }
        const countResult = await actions.settings.getPhotoCount({});
        if (countResult.data) {
          setPhotoCount(countResult.data.count);
        }
      } catch (error) {
        console.error('Error fetching sizes or photo count:', error);
      }
    }
    fetchData();
  }, []);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.width || parseInt(formData.width) <= 0) newErrors.width = 'Width must be a positive number';
    if (!formData.height || parseInt(formData.height) <= 0) newErrors.height = 'Height must be a positive number';
    if (!formData.quality || parseInt(formData.quality) <= 0 || parseInt(formData.quality) > 100) {
      newErrors.quality = 'Quality must be between 1 and 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await actions.settings.addImageSize({
        name: formData.name,
        width: parseInt(formData.width),
        height: parseInt(formData.height),
        quality: parseInt(formData.quality),
        processExisting: formData.processExisting
      });
      
      if (result.data?.success) {
        setImageSizes(prev => [...prev, [result.data.sizeName, { ...result.data.config, isCustom: true }]]);
        
        let message = `New size "${result.data.sizeName}" added successfully!`;
        
        if (result.data.processingResult) {
          const { processed, failed, errors } = result.data.processingResult;
          message += `\n\nProcessing results:\n- Successfully processed: ${processed} images\n- Failed: ${failed} images`;
          
          if (errors.length > 0) {
            message += `\n\nErrors:\n${errors.slice(0, 3).join('\n')}`;
            if (errors.length > 3) {
              message += `\n... and ${errors.length - 3} more errors`;
            }
          }
        } else if (formData.processExisting) {
          message += `\n\nNote: Processing was requested but no images were found.`;
        }
        
        if (result.data.processingError) {
          message += `\n\nWarning: ${result.data.processingError}`;
        }
        
        alert(message);
        setIsDialogOpen(false);
        setFormData({ name: '', width: '', height: '', quality: '', processExisting: false });
      }
    } catch (error) {
      console.error('Error adding size:', error);
      alert('Failed to add size.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const openDeleteDialog = (sizeName: string) => {
    setDeleteData({ sizeName, deleteExistingImages: false });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    
    try {
      const result = await actions.settings.deleteImageSize({
        sizeName: deleteData.sizeName,
        deleteExistingImages: deleteData.deleteExistingImages
      });
      
      if (result.data?.success) {
        // Remove the size from the local state
        setImageSizes(prev => prev.filter(([name]) => name !== deleteData.sizeName));
        
        let message = `Size "${deleteData.sizeName}" deleted successfully!`;
        
        if (result.data.deletionResult) {
          const { deleted, failed, errors } = result.data.deletionResult;
          message += `\n\nFile deletion results:\n- Successfully deleted: ${deleted} images\n- Failed: ${failed} images`;
          
          if (errors.length > 0) {
            message += `\n\nErrors:\n${errors.slice(0, 3).join('\n')}`;
            if (errors.length > 3) {
              message += `\n... and ${errors.length - 3} more errors`;
            }
          }
        } else if (deleteData.deleteExistingImages) {
          message += `\n\nNote: File deletion was requested but no images were found.`;
        }
        
        alert(message);
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting size:', error);
      alert('Failed to delete size.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Image Sizes</h1>
            <p className="text-muted-foreground mt-1">Configure custom image sizes for automatic processing. These sizes will be available for generating responsive images and thumbnails.</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Image Size
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Image Sizes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageSizes.map(([name, config], index) => (
              <div key={index} className="p-4 bg-card border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{name}</h3>
                  {config.isCustom && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Custom</span>}
                </div>
                <p className="text-sm text-muted-foreground">{config.width}x{config.height} @ {config.quality}% quality</p>
                {config.isCustom && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => openDeleteDialog(name)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Image Size</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="deleteImages">Delete Processed Images</Label>
                  <Switch
                    id="deleteImages"
                    checked={deleteData.deleteExistingImages}
                    onCheckedChange={(checked) => setDeleteData({ ...deleteData, deleteExistingImages: checked })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete Size'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Image Size</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Size Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., custom-size"
                />
                {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    placeholder="Enter width"
                  />
                  {errors.width && <p className="text-destructive text-sm">{errors.width}</p>}
                </div>
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    placeholder="Enter height"
                  />
                  {errors.height && <p className="text-destructive text-sm">{errors.height}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="quality">Quality (%)</Label>
                <Input
                  id="quality"
                  type="number"
                  value={formData.quality}
                  onChange={(e) => handleInputChange('quality', e.target.value)}
                  placeholder="Enter quality"
                />
                {errors.quality && <p className="text-destructive text-sm">{errors.quality}</p>}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Switch 
                  id="processExisting" 
                  checked={formData.processExisting}
                  onCheckedChange={(checked) => handleInputChange('processExisting', checked)}
                />
                <Label htmlFor="processExisting">Process existing images ({photoCount} images)</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Size'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
});

SettingsManagement.displayName = 'SettingsManagement';

