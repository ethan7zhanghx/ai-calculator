import { Suspense } from 'react';
import PageContent from '@/components/page-content';
import { Loader2 } from 'lucide-react';

export default function AIRequirementsCalculatorPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PageContent />
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-lg">加载中...</span>
      </div>
    </div>
  );
}
