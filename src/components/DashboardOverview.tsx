import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  FolderOpen, 
  ImageIcon, 
  HardDrive, 
  TrendingUp, 
  Plus,
  Upload,
  Settings,
  Users,
  Globe,
  Lock,
  Star
} from 'lucide-react';
import { actions } from 'astro:actions';
import { getImageUrls } from '@/lib/image-client';
import type { Gallery, Photo } from '@/lib/db/schema';

interface DashboardStats {
  photos: {
    total: number;
    recent: Photo[];
  };
  galleries: {
    total: number;
    featured: number;
    private: number;
    recent: Array<Gallery & { photoCount: number; coverImage?: { imageId: string } | null }>;
  };
  storage: {
    usedBytes: number;
    limitBytes: number;
    usedFormatted: string;
    limitFormatted: string;
    usagePercentage: number;
    usageDisplay: string;
  };
}

interface DashboardOverviewProps {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export const DashboardOverview = observer(function DashboardOverview({ user }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [photoCountResult, galleryCountsResult, recentPhotosResult, recentGalleriesResult, storageResult] = await Promise.all([
        actions.photos.getCount({}),
        actions.galleries.getCounts({}),
        actions.photos.list({ limit: 6, offset: 0 }),
        actions.galleries.getAll({ limit: 2, offset: 0 }),
        actions.storage.getUsage({})
      ]);

      // Check for errors
      if (photoCountResult.error) throw new Error(photoCountResult.error.message);
      if (galleryCountsResult.error) throw new Error(galleryCountsResult.error.message);
      if (recentPhotosResult.error) throw new Error(recentPhotosResult.error.message);
      if (recentGalleriesResult.error) throw new Error(recentGalleriesResult.error.message);
      if (storageResult.error) throw new Error(storageResult.error.message);

      setStats({
        photos: {
          total: photoCountResult.data?.count || 0,
          recent: recentPhotosResult.data?.photos || []
        },
        galleries: {
          total: galleryCountsResult.data?.total || 0,
          featured: galleryCountsResult.data?.featured || 0,
          private: galleryCountsResult.data?.private || 0,
          recent: recentGalleriesResult.data?.galleries || []
        },
        storage: storageResult.data || {
          usedBytes: 0,
          limitBytes: 5 * 1024 * 1024 * 1024,
          usedFormatted: '0 B',
          limitFormatted: '5 GB',
          usagePercentage: 0,
          usageDisplay: '0 B / 5 GB'
        }
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-destructive mb-4">Error loading dashboard: {error}</p>
                <Button onClick={fetchDashboardData}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name || user.email}!</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.photos.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.photos.recent.length} uploaded recently
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Galleries</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.galleries.total}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{stats.galleries.featured} featured</span>
                <span>•</span>
                <span>{stats.galleries.private} private</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.storage.usedFormatted}</div>
              <div className="mt-2">
                <Progress value={stats.storage.usagePercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.storage.usageDisplay}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button asChild className="h-20 flex-col">
                <a href="/photos">
                  <Upload className="h-6 w-6 mb-2" />
                  Upload Photos
                </a>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <a href="/galleries">
                  <Plus className="h-6 w-6 mb-2" />
                  New Gallery
                </a>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <a href="/settings/sizes">
                  <Settings className="h-6 w-6 mb-2" />
                  Image Sizes
                </a>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <a href="/users">
                  <Users className="h-6 w-6 mb-2" />
                  Manage Users
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Recent Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.photos.recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No photos uploaded yet</p>
                  <Button asChild className="mt-2" size="sm">
                    <a href="/photos">Upload your first photo</a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {stats.photos.recent.map((photo) => (
                      <a 
                        key={photo.id} 
                        href={`/photos/${photo.id}`}
                        className="flex items-center space-x-3 p-2 -m-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={getImageUrls(photo.imageId).thumbnail}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{photo.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {photo.description || 'No description'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <a href="/photos">View all photos</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Galleries */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Recent Galleries
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {stats.galleries.recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No galleries created yet</p>
                  <Button asChild className="mt-2" size="sm">
                    <a href="/galleries">Create your first gallery</a>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Top spacer - empty for now */}
                  <div></div>
                  
                  {/* Middle section with galleries - takes available space */}
                  <div className="flex-1 space-y-4">
                    {stats.galleries.recent.map((gallery) => (
                      <a 
                        key={gallery.id} 
                        href={`/galleries/${gallery.id}`}
                        className="flex items-center space-x-4 p-3 -m-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {gallery.coverImage ? (
                            <img
                              src={getImageUrls(gallery.coverImage.imageId).thumbnail}
                              alt={gallery.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FolderOpen className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{gallery.name}</p>
                            <div className="flex items-center gap-1">
                              {gallery.isFeatured && (
                                <Star className="h-3 w-3 text-yellow-500" />
                              )}
                              {gallery.isPublic ? (
                                <Globe className="h-3 w-3 text-green-500" />
                              ) : (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {gallery.photoCount} photos
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Updated {gallery.updatedAt ? new Date(gallery.updatedAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                  
                  {/* Bottom section with button */}
                  <div className="mt-4">
                    <Button asChild variant="outline" className="w-full">
                      <a href="/galleries">View all galleries</a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});
