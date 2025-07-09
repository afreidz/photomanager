import React, { useState } from 'react';
import { User, LogOut, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createAuthClient } from 'better-auth/client';

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      const authClient = createAuthClient({
        baseURL: window.location.origin,
      });

      // Use better-auth client to sign out
      await authClient.signOut();
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full rounded-none justify-between h-auto p-3 hover:bg-accent"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
              {user.image ? (
                <img 
                  src={user.image} 
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <User size={16} />
              )}
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        side="top"
        className="w-40"
        sideOffset={8}
      >
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoading}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut size={16} />
          {isLoading ? 'Logging out...' : 'Logout'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
