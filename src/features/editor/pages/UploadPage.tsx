/**
 * Upload Page - minimal scaffolding
 * Users will upload images here
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Upload Images</h2>
        <p className="text-muted-foreground">
          Upload your photos to get started
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Image Upload</CardTitle>
          <CardDescription>
            Select images to upload for your product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Upload functionality will be implemented later */}
          <p className="text-sm text-muted-foreground">
            Upload interface placeholder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
