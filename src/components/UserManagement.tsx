import { InviteUserButton } from './InviteUserButton';
import { UsersTable } from './UsersTable';
import type { User, Invitation } from '../lib/db/schema';

// The database types match what we need for the components

interface UserManagementProps {
  users: User[];
  invitations: Invitation[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
}

export function UserManagement({ 
  users, 
  invitations, 
  currentUserId, 
  isCurrentUserAdmin 
}: UserManagementProps) {
  return (
    <div className="p-8">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              User Invitations & Management
            </h1>
            <p className="text-muted-foreground mt-1">
              {users.length} users • {invitations.length} pending invitations
            </p>
          </div>
          <InviteUserButton isCurrentUserAdmin={isCurrentUserAdmin} />
        </div>

        <UsersTable 
          users={users} 
          invitations={invitations} 
          currentUserId={currentUserId} 
          isCurrentUserAdmin={isCurrentUserAdmin}
        />
      </div>
    </div>
  );
}
