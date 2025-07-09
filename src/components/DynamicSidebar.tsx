import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Sidebar } from '@/components/Sidebar';
import { appStore } from '@/stores/AppStore';

interface DynamicSidebarProps {
  currentPath?: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export const DynamicSidebar = observer(function DynamicSidebar({ currentPath, user }: DynamicSidebarProps) {
  useEffect(() => {
    // Fetch all app counts when component mounts
    appStore.fetchCounts();
  }, []);

  return <Sidebar currentPath={currentPath} appCounts={appStore.counts} user={user} />;
});
