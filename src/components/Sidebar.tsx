import React from 'react';
import { 
  Home, 
  FolderOpen, 
  ImageIcon, 
  Globe, 
  Eye, 
  FileImage, 
  BarChart3, 
  Key, 
  Users, 
  Settings,
  ChevronDown,
  ChevronRight,
  Camera
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { actions } from 'astro:actions';
import { SITE_TITLE } from 'astro:env/client';
import { UserMenu } from './UserMenu';

interface NavigationItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  count?: number;
  countSuffix?: string;
  hasSubmenu?: boolean;
  submenu?: NavigationItem[];
  isExpanded?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: Home,
    href: '/dashboard'
  },
  {
    label: 'Galleries',
    icon: FolderOpen,
    href: '/galleries',
    count: 12,
    hasSubmenu: true,
    isExpanded: true,
    submenu: [
      {
        label: 'All Galleries',
        icon: ImageIcon,
        href: '/galleries'
      },
      {
        label: 'Featured Galleries',
        icon: Globe,
        href: '/galleries/featured'
      },
      {
        label: 'Private Galleries',
        icon: Eye,
        href: '/galleries/private'
      }
    ]
  },
  {
    label: 'Photo Library',
    icon: FileImage,
    href: '/photos',
    count: 1200,
    countSuffix: 'k'
  }
];

// Create management items conditionally
  const createManagementItems = (showInvitations: boolean): NavigationItem[] => {
    const items: NavigationItem[] = [
      {
        label: 'Analytics',
        icon: BarChart3,
        href: '/analytics'
      },
      {
        label: 'Users',
        icon: Users,
        href: '/users'
      }
    ];


    items.push({
      label: 'Settings',
      icon: Settings,
      href: '#',
      hasSubmenu: true,
      submenu: [
        {
          label: 'Image Sizes',
          icon: ImageIcon,
          href: '/settings/sizes'
        },
        {
          label: 'API Keys',
          icon: Key,
          href: '/settings/api-keys'
        }
      ]
    });

    return items;
  };

interface AppCounts {
  galleries: {
    total: number;
    featured: number;
    private: number;
  };
  photos: number;
}

interface SidebarProps {
  currentPath?: string;
  appCounts?: AppCounts;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function Sidebar({ currentPath = '', appCounts, user }: SidebarProps) {
  const initialExpanded = ['Galleries'];
  if (currentPath.startsWith('/settings')) {
    initialExpanded.push('Settings');
  }
  const [expandedItems, setExpandedItems] = React.useState<string[]>(initialExpanded);
  
  // Storage usage state
  const [storageUsage, setStorageUsage] = React.useState({
    usedBytes: 0,
    limitBytes: 5 * 1024 * 1024 * 1024, // 5GB
    usedFormatted: '0 B',
    limitFormatted: '5 GB',
    usagePercentage: 0,
    usageDisplay: '0 B / 5 GB',
  });
  
  // Fetch storage usage on component mount
  React.useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const result = await actions.storage.getUsage({});
        if (result.data) {
          setStorageUsage(result.data);
        }
      } catch (error) {
        console.error('Error fetching storage usage:', error);
      }
    };
    fetchStorageUsage();
  }, []);
  

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  // Create navigation items with dynamic counts
  const dynamicNavigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard'
    },
    {
      label: 'Galleries',
      icon: FolderOpen,
      href: '/galleries',
      hasSubmenu: true,
      isExpanded: true,
      submenu: [
        {
          label: 'All Galleries',
          icon: ImageIcon,
          href: '/galleries',
          count: appCounts?.galleries.total || 0
        },
        {
          label: 'Featured Galleries',
          icon: Globe,
          href: '/galleries/featured',
          count: appCounts?.galleries.featured || 0
        },
        {
          label: 'Private Galleries',
          icon: Eye,
          href: '/galleries/private',
          count: appCounts?.galleries.private || 0
        }
      ]
    },
    {
      label: 'Photo Library',
      icon: FileImage,
      href: '/photos',
      count: appCounts?.photos || 0
    }
  ];

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = currentPath === item.href;
    const isExpanded = expandedItems.includes(item.label);
    const Icon = item.icon;
    
    // Check if any submenu item is active to avoid highlighting parent
    const hasActiveSubmenu = item.submenu?.some(subItem => currentPath === subItem.href);
    const shouldHighlight = isActive && !hasActiveSubmenu;

    return (
      <div key={item.label}>
        <a
          href={item.href}
          className={cn(
            "flex items-center justify-between text-sm rounded-lg transition-colors group",
            level > 0 
              ? "ml-6 pl-6 pr-3 py-2.5" // Subnav items with less right padding
              : "w-full px-3 py-2.5", // Parent items
            shouldHighlight 
              ? "bg-accent text-accent-foreground font-medium" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
          onClick={(e) => {
            if (item.hasSubmenu || item.href === '#') {
              e.preventDefault();
              toggleExpanded(item.label);
            }
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon size={18} className={cn(
              "shrink-0",
              isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span className="truncate">{item.label}</span>
          </div>
          
          <div className="flex items-center justify-center w-[22px] h-[22px] shrink-0">
            {item.hasSubmenu ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpanded(item.label);
                }}
                className="p-0.5 flex items-center justify-center"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground" />
                )}
              </button>
            ) : item.count !== undefined ? (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center",
                  isActive && "bg-background text-foreground border-border"
                )}
              >
                {item.count}{item.countSuffix || ''}
              </Badge>
            ) : null}
          </div>
        </a>

        {item.submenu && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.submenu.map(subItem => renderNavigationItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-72 flex-col bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Camera size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">PhotoManager</h1>
          {SITE_TITLE && <p className="text-sm text-muted-foreground">{SITE_TITLE}</p>}
        </div>
      </div>


      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <nav className="space-y-1 pt-4">
          {dynamicNavigationItems.map(item => renderNavigationItem(item))}
        </nav>

        {/* Management Section */}
        <div className="mt-8">
          <h3 className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Management
          </h3>
          <nav className="space-y-1">
            {createManagementItems(false).map(item => renderNavigationItem(item))}
          </nav>
        </div>
      </div>

      {/* Storage Footer */}
      <div className="border-t border-border p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage Used</span>
            <span className="font-medium">{storageUsage.usedFormatted} / {storageUsage.limitFormatted}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${storageUsage.usagePercentage}%` }} />
          </div>
        </div>
      </div>

      {/* User Menu */}
      <div className="border-t border-border p-4">
        <UserMenu user={user} />
      </div>
    </div>
  );
}
