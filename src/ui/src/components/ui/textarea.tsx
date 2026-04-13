import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-slate-100 shadow-sm shadow-black/30 transition-shadow placeholder:text-slate-500 focus-visible:border-[#00ff7f]/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#00ff7f]/20 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
