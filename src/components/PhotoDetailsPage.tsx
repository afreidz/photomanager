import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { actions } from 'astro:actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getImageUrls, IMAGE_SIZES } from '@/lib/image-client';
import { Edit2, Save, X, Plus, Tag, Eye, FileText, Calendar, Camera, Trash2 } from 'lucide-react';
import type { Photo } from '@/lib/db/schema';

interface PhotoDetailsPageProps {
  photoId: string;
  onClose?: () => void;
}

interface PhotoData extends Photo {
  tags: string | null;
}

const PhotoDetailsPage: React.FC<PhotoDetailsPageProps> = observer(({ photoId, onClose }) => {
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  
  // Individual section editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  
  // Image display state
  const [selectedSize, setSelectedSize] = useState<'thumbnail' | 'small' | 'medium' | 'large' | 'xlarge' | 'splash'>('medium');
  
  // Load photo data
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await actions.photos.getById({ id: photoId });
        if (result.error) {
          setError(result.error.message);
          return;
        }
        
        const photoData = result.data?.photo;
        if (!photoData) {
          setError('Photo not found');
          return;
        }
        
        setPhoto(photoData);
        setEditTitle(photoData.title);
        setEditDescription(photoData.description || '');
        setEditTags(photoData.tags ? JSON.parse(photoData.tags) : []);
      } catch (err) {
        setError('Failed to load photo');
        console.error('Error loading photo:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [photoId]);

  const handleSave = async () => {
    if (!photo) return;
    
    try {
      setSaving(true);
      const result = await actions.photos.update({
        id: photo.id,
        title: editTitle,
        description: editDescription,
        tags: editTags,
      });
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      // Update local state
      setPhoto(prev => prev ? {
        ...prev,
        title: editTitle,
        description: editDescription,
        tags: JSON.stringify(editTags),
      } : null);
      
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save changes');
      console.error('Error saving photo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
      setShowAddTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setNewTag('');
      setShowAddTag(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Photo not found</p>
      </div>
    );
  }

  const imageUrls = getImageUrls(photo.imageId);
  // const srcSet = getResponsiveSrcSet(photo.imageId);
  const parsedTags = photo.tags ? JSON.parse(photo.tags) : [];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-3xl font-bold border-none p-0 focus:ring-0"
                placeholder="Photo title"
              />
            ) : (
              photo.title
            )}
          </h1>
          <p className="text-gray-500 mt-1">
            {formatDate(photo.createdAt || new Date())} • Asset footprint: {formatFileSize(photo.assetFootprint)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(photo.title);
                  setEditDescription(photo.description || '');
                  setEditTags(parsedTags);
                }}
                variant="outline"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={async () => {
                if (confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
                  if (!photo) return;
                  try {
                    const result = await actions.photos.delete({ id: photo.id });
                    if (result.error) {
                      setError(result.error.message);
                      return;
                    }
                    // Optionally show a success message or toast here
                    if (onClose) {
                      onClose();
                    } else {
                      setPhoto(null);
                    }
                  } catch (err) {
                    setError('Failed to delete photo');
                    console.error('Error deleting photo:', err);
                  }
                }
              }}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          
          {onClose && (
            <Button onClick={onClose} variant="outline">
              <X className="w-4 h-4" />
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Display */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Image Size Selector */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">View size:</span>
                {(['thumbnail', 'small', 'medium', 'large', 'xlarge', 'splash'] as const).map((size) => (
                  <Button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    variant={selectedSize === size ? 'default' : 'outline'}
                    size="sm"
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Image */}
            <div className="relative flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900 overflow-auto">
              <img
                src={imageUrls[selectedSize]}
                alt={photo.title}
                className="block"
                style={{ 
                  maxWidth: 'none',
                  maxHeight: 'none',
                  width: 'auto',
                  height: 'auto'
                }}
              />
              
              {/* Image Info Overlay */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-md text-sm">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {IMAGE_SIZES[selectedSize].width} × {IMAGE_SIZES[selectedSize].height}
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Description</h3>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setEditingDescription(true)}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </Button>
              )}
            </div>
            
            {(isEditing || editingDescription) ? (
              <div className="space-y-2">
                <Textarea
                  value={editDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full"
                />
                {editingDescription && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingDescription(false);
                        setEditDescription(photo.description || '');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">
                {photo.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Tags</h3>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setEditingTags(true)}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </Button>
              )}
            </div>
            
            {/* Tag Cloud */}
            <div className="flex flex-wrap gap-3 mb-4">
              {((isEditing || editingTags) ? editTags : parsedTags).map((tag: string, index: number) => {
                // Generate a simple hash for consistent colors
                const tagHash = tag.split('').reduce((a: number, b: string) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                const hue = Math.abs(tagHash) % 360;
                
                return (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 hover:scale-105 transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: `hsl(${hue}, 70%, 85%)`,
                      color: `hsl(${hue}, 70%, 30%)`,
                      border: `1px solid hsl(${hue}, 70%, 70%)`
                    }}
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    {(isEditing || editingTags) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                        className="ml-1 hover:text-red-500 hover:scale-110 transition-all duration-200"
                        title={`Remove tag: ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
              
              {/* Add Tag Button/Input */}
              {(isEditing || editingTags) && (
                <div className="flex items-center gap-2">
                  {showAddTag ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Add tag..."
                        className="w-24 h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        onClick={handleAddTag}
                        size="sm"
                        className="h-8 px-2"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowAddTag(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 h-8"
                    >
                      <Plus className="w-3 h-3" />
                      Add Tag
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Save/Cancel buttons for inline tags editing */}
            {editingTags && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditingTags(false);
                    setEditTags(parsedTags);
                    setShowAddTag(false);
                    setNewTag('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
              </div>
            )}
            
            {(isEditing ? editTags : parsedTags).length === 0 && (
              <p className="text-gray-500 text-sm">No tags added</p>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Metadata</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Size:</span>
                <span className="font-mono">{selectedSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Asset Footprint:</span>
                <span className="font-mono">{formatFileSize(photo.assetFootprint)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Uploaded:</span>
                <span>{formatDate(photo.createdAt || new Date())}</span>
              </div>
              {photo.updatedAt && photo.updatedAt !== photo.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Modified:</span>
                  <span>{formatDate(photo.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PhotoDetailsPage;
