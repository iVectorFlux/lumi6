import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonStats } from '@/components/ui/skeleton-card';
import { designTokens } from '@/design-system/tokens';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  className?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue',
  className 
}: StatCardProps) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
    red: 'text-red-600 bg-red-100',
  };

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className={cn(designTokens.typography.caption, 'font-medium')}>
              {title}
            </p>
            <p className={cn(designTokens.typography.heading2, 'font-bold')}>
              {value}
            </p>
            {trend && (
              <div className={cn(
                'flex items-center text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                <span className="mr-1">
                  {trend.isPositive ? '↗' : '↘'}
                </span>
                {Math.abs(trend.value)}% from last month
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'p-3 rounded-lg',
              colorClasses[color]
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  stats: StatCardProps[];
  loading?: boolean;
  className?: string;
}

export const StatsCards = ({ stats, loading, className }: StatsCardsProps) => {
  if (loading) {
    return <SkeletonStats count={stats.length} />;
  }

  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
      className
    )}>
      {stats.map((stat, index) => (
        <StatCard
          key={`${stat.title}-${index}`}
          {...stat}
        />
      ))}
    </div>
  );
}; 