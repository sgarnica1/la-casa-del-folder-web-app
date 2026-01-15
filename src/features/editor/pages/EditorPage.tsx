/**
 * Editor Page - minimal scaffolding
 * Users will assign images to layout slots here
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export function EditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Editor</h2>
        <p className="text-muted-foreground">
          Assign images to layout slots
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Layout Editor</CardTitle>
          <CardDescription>
            Drag and assign images to slots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Editor functionality will be implemented later */}
          <p className="text-sm text-muted-foreground">
            Editor interface placeholder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
