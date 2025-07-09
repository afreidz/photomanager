import { useEffect, useState } from 'react';
import { actions } from 'astro:actions';
import type { ApiKey } from '@/lib/db/schema.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Plus, Copy, Eye, Trash2 } from 'lucide-react';

interface ApiKeyWithKey extends Omit<ApiKey, 'keyHash'> {
  key: string;
}

// Interface for API key data structure
// interface ApiKeyData {
//   id: string;
//   name: string;
//   keyValue: string;
//   lastUsed: Date | null;
//   createdAt: Date;
// }

interface ApiKeyManagementProps {
  userId: string;
}

export default function ApiKeyManagement({ userId }: ApiKeyManagementProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpires, setNewKeyExpires] = useState('');
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, [userId]);

  const fetchApiKeys = async () => {
    try {
      const result = await actions.apiKeys.getAll({ userId });
      if (result.data) {
        setApiKeys(result.data as ApiKeyWithKey[]);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please provide a name for the API key');
      return;
    }

    setIsCreating(true);
    try {
      const result = await actions.apiKeys.create({
        name: newKeyName,
        userId,
        expiresAt: newKeyExpires || undefined,
      });

      if (result.data) {
        setNewlyCreatedKey(result.data.key);
        setNewKeyName('');
        setNewKeyExpires('');
        setShowNewKeyDialog(false);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    try {
      await actions.apiKeys.update({
        id: keyId,
        userId,
        isActive,
      });
      fetchApiKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      alert('Failed to update API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await actions.apiKeys.delete({
        id: keyId,
        userId,
      });
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key');
    }
  };

  // Helper function for date formatting
  // const formatDate = (date: Date | null) => {
  //   if (!date) return 'Never';
  //   return date.toLocaleDateString();
  // };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('API key copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return <div className="p-8">Loading API keys...</div>;
  }

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">API Key Management</h1>
            <p className="text-muted-foreground mt-1">Create and manage API keys for accessing your photography CMS programmatically.</p>
          </div>
          <Button onClick={() => setShowNewKeyDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New API Key
          </Button>
        </div>

      {/* New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Label className="block text-sm font-medium mb-2">Name</Label>
            <Input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Mobile App, External Service"
            />
          </div>
          <div className="mb-4">
            <Label className="block text-sm font-medium mb-2">Expires At (optional)</Label>
            <Input
              type="date"
              value={newKeyExpires}
              onChange={(e) => setNewKeyExpires(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Newly Created Key Display */}
{newlyCreatedKey && (
        <Card className="mb-6 border-emerald-500 bg-emerald-900/20">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-emerald-500">API Key Created Successfully!</h3>
                <p className="text-sm text-foreground/50 mt-1">
                  Please copy this key now. You won't be able to see it again.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setNewlyCreatedKey(null)}>
                <Trash2 className="h-4 w-4 mr-1" />
              </Button>
            </div>
            <div className="mt-3 flex items-center space-x-2">
              <code className="bg-background/10 px-3 py-2 rounded border border-emerald-500 text-sm font-mono flex-1">
                {newlyCreatedKey}
              </code>
              <Button onClick={() => copyToClipboard(newlyCreatedKey)}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Keys List */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>{key.name}</TableCell>
              <TableCell>
                <Badge variant={key.isActive ? "default" : "destructive"}>
                  {key.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {key.key}
                </Badge>
              </TableCell>
              <TableCell className="flex items-center space-x-2">
                <Button variant="ghost" onClick={() => handleToggleKey(key.id, !key.isActive)}>
                  <Eye className="h-4 w-4 mr-1" /> {key.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteKey(key.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Usage Instructions */}
      </div>
    </div>
  );
}
