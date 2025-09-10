'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Phone,
  Home,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Call', href: '/calls', icon: Phone },
  { name: 'Dipendenti', href: '/employees', icon: Users },
  { name: 'Priorità', href: '/priorities', icon: TrendingUp },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  { name: 'Report', href: '/reports', icon: BarChart3 },
  { name: 'Impostazioni', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-card border-r h-screen transition-colors">
      <div className="flex items-center justify-between h-16 px-4 border-b bg-muted/50">
        <h1 className="text-xl font-bold text-foreground">HR Call Tracker</h1>
        <ThemeToggle variant="dropdown" size="sm" />
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
              {item.name}
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
  );
}