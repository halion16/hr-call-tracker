'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Phone,
  Home,
  TrendingUp,
  Bell,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationCenter } from '@/components/notifications/notification-center';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Call', href: '/calls', icon: Phone },
  { name: 'Dipendenti', href: '/employees', icon: Users },
  { name: 'Workflow AI', href: '/workflow', icon: Brain, badge: 'NEW' },
  { name: 'Priorità', href: '/priorities', icon: TrendingUp },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  { name: 'Report', href: '/reports', icon: BarChart3 },
  { name: 'Impostazioni', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <div className="flex flex-col w-64 bg-card border-r h-screen transition-colors">
        <div className="flex items-center justify-between h-16 px-4 border-b bg-muted/50">
          <h1 className="text-xl font-bold text-foreground">HR Call Tracker</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotifications(true)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>
            <ThemeToggle variant="dropdown" size="sm" />
          </div>
        </div>
      
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg transition-colors smooth-hover',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">HR</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">Responsabile HR</p>
              <p className="text-xs text-muted-foreground">hr@company.it</p>
            </div>
          </div>
        </div>
      </div>
      
      <NotificationCenter 
        showCenter={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}