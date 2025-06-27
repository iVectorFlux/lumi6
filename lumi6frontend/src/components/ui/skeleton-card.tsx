import { Card, CardContent, CardHeader } from './card';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  showHeader?: boolean;
  headerLines?: number;
  contentLines?: number;
  showActions?: boolean;
}

export const SkeletonCard = ({ 
  className,
  showHeader = true,
  headerLines = 2,
  contentLines = 3,
  showActions = false
}: SkeletonCardProps) => (
  <Card className={cn('animate-pulse', className)}>
    {showHeader && (
      <CardHeader>
        {Array.from({ length: headerLines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4',
              i === 0 ? 'w-1/3' : 'w-2/3'
            )} 
          />
        ))}
      </CardHeader>
    )}
    <CardContent className="space-y-3">
      {Array.from({ length: contentLines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
      {showActions && (
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </CardContent>
  </Card>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="border rounded-lg">
    {/* Header */}
    <div className="grid grid-cols-4 gap-4 p-4 border-b bg-gray-50">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-20" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStats = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const SkeletonList = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
); 