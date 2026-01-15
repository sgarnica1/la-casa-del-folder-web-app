/**
 * Preview Page - minimal scaffolding
 * Users will preview the final product here
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';

export function PreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Preview</h2>
        <p className="text-muted-foreground">
          Review your product before ordering
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Preview</CardTitle>
          <CardDescription>
            Preview of your final product
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview functionality will be implemented later */}
          <p className="text-sm text-muted-foreground">
            Preview interface placeholder
          </p>
          <div className="flex gap-2">
            <Button>Lock Draft</Button>
            <Button variant="outline">Back to Editor</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
