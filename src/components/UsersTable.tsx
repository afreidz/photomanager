import React, { useState } from 'react';
import { actions } from 'astro:actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Copy, Trash2 } from 'lucide-react';
import type { User, Invitation } from '../lib/db/schema';

interface UsersTableProps {
  users: User[];
  invitations: Invitation[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
}

export function UsersTable({
  users,
  invitations,
  currentUserId,
  isCurrentUserAdmin,
}: UsersTableProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await actions.users.delete({ id: userId });
      if (result.data?.success) {
        window.location.reload();
      } else {
        alert('Error deleting user: ' + (result.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await actions.invitations.delete({ id: invitationId });
      if (result.data?.success) {
        window.location.reload();
      } else {
        alert('Error deleting invitation: ' + (result.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('Error deleting invitation: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvitation = async (token: string) => {
    const inviteUrl = `${window.location.origin}/register?token=${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Invitation link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy link');
    }
  };

  const activeInvitations = invitations.filter(invite => !invite.isUsed);

  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col" style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}>
      <h3 className="text-xl font-semibold text-card-foreground mb-4">
        Users & Invitations
      </h3>
      
      <div className="flex-1 relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={`user-${user.id}`} data-user-id={user.id}>
                <TableCell>{user.name || 'Not provided'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.id === currentUserId ? (
                    <Badge variant="default">
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      User
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.id !== currentUserId && isCurrentUserAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isLoading}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            
            {isCurrentUserAdmin && activeInvitations.map((invitation) => (
              <TableRow key={`invitation-${invitation.id}`}>
                <TableCell>{invitation.email || 'Open Invitation'}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    Invited
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleCopyInvitation(invitation.token)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Invitation Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isLoading}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Invitation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {users.length === 0 && activeInvitations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No users or invitations found.
        </div>
      )}
    </div>
  );
}
