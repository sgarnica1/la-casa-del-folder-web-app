import * as React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size = 'md', fullScreen = false, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4 border-2',
      md: 'h-8 w-8 border-2',
      lg: 'h-12 w-12 border-3',
    };

    if (fullScreen) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div
            ref={ref}
            className={cn(
              'animate-spin rounded-full border-primary border-t-transparent',
              sizeClasses[size],
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full border-primary border-t-transparent',
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Loading.displayName = 'Loading';

export { Loading };
