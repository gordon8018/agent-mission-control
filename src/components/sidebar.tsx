import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  current: boolean;
}

export function Sidebar({ currentPath }: { currentPath: string }) {
  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: require('lucide-react').LayoutDashboard, current: currentPath === '/' },
    { name: 'Tasks', href: '/tasks', icon: require('lucide-react').Kanban, current: currentPath === '/tasks' },
    { name: 'Calendar', href: '/calendar', icon: require('lucide-react').Calendar, current: currentPath === '/calendar' },
    { name: 'Memory', href: '/memory', icon: require('lucide-react').Brain, current: currentPath === '/memory' },
    { name: 'Team', href: '/team', icon: require('lucide-react').Users, current: currentPath === '/team' },
    { name: 'Swarm', href: '/swarm', icon: require('lucide-react').Bot, current: currentPath === '/swarm' || currentPath.startsWith('/swarm/') },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Mission Control</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              item.current
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
