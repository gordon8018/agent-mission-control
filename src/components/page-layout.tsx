import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  currentPath: string;
  actions?: ReactNode;
}

export function PageLayout({ children, title, currentPath, actions }: PageLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPath={currentPath} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
            {actions}
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
