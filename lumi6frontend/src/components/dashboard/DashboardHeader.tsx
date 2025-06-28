import { ReactNode } from 'react';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { designTokens } from '@/design-system/tokens';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  actions?: ReactNode;
  onLogout?: () => void;
  className?: string;
}

export const DashboardHeader = ({
  title,
  subtitle,
  userName,
  userRole,
  actions,
  onLogout,
  className
}: DashboardHeaderProps) => {
  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'companyadmin': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className={cn('flex items-center justify-between p-6', className)}>
      <div className="flex-1 min-w-0">
        <h1 className={designTokens.typography.heading2}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn(designTokens.typography.caption, 'mt-1')}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        
        {userName && (
          <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-lg shadow-sm">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm font-medium">
                {getUserInitials(userName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className={designTokens.typography.bodySmall}>
                  {userName}
                </span>
                {userRole && (
                  <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs">
                    {userRole}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {onLogout && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onLogout}
            className="hidden sm:flex"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}; 