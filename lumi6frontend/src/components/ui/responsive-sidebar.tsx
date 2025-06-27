import { useState, useEffect, ReactNode } from 'react';
import { X, Menu, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { NavItem } from '@/types/common';

interface ResponsiveSidebarProps {
  children: ReactNode;
  navItems: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const ResponsiveSidebar = ({
  children,
  navItems,
  currentPath,
  onNavigate,
  header,
  footer,
  className
}: ResponsiveSidebarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const isActive = (path: string) => currentPath === path;
  const isExpanded = (path: string) => expandedItems.includes(path);

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.path);
    const isItemExpanded = isExpanded(item.path);

    return (
      <div key={item.path}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.path);
            } else {
              onNavigate(item.path);
            }
          }}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            level > 0 && 'ml-4 pl-8',
            isItemActive 
              ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600 shadow-sm' 
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
          )}
          aria-current={isItemActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isItemExpanded : undefined}
        >
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.label}</span>
            {item.badge && (
              <span className={cn(
                'ml-auto px-2 py-1 text-xs rounded-full',
                typeof item.badge === 'number' && item.badge > 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600'
              )}>
                {item.badge}
              </span>
            )}
          </div>
          
          {hasChildren && (
            <ChevronRight 
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isItemExpanded && 'rotate-90'
              )} 
            />
          )}
        </button>

        {hasChildren && isItemExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-lg">
      {header && (
        <div className="flex-shrink-0 border-b">
          {header}
        </div>
      )}

      <nav className="flex-1 py-6 overflow-y-auto">
        <div className="px-4 space-y-2">
          {navItems.map(item => renderNavItem(item))}
        </div>
      </nav>

      {footer && (
        <div className="flex-shrink-0 border-t">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-md"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:block fixed inset-y-0 left-0 z-50 w-64',
        className
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          
          <aside className="relative flex flex-col w-64 bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={cn('lg:pl-64 min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/30 to-blue-50/20', className)}>
        {children}
      </div>
    </>
  );
}; 