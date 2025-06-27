import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { designTokens } from '@/design-system/tokens';

interface DashboardLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export const DashboardLayout = ({ 
  children, 
  header, 
  sidebar, 
  className 
}: DashboardLayoutProps) => {
  return (
    <div className={cn('min-h-screen bg-white', className)}>
      {sidebar && (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-sm lg:block">
          {sidebar}
        </aside>
      )}
      
      <div className={cn('flex-1', sidebar && 'lg:pl-64')}>
        {header && (
          <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
            {header}
          </header>
        )}
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}; 