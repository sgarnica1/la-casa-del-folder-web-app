/**
 * Order Confirmation Page - minimal scaffolding
 * Users will see order confirmation here
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export function OrderConfirmationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Order Confirmation</h2>
        <p className="text-muted-foreground">
          Your order has been placed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>
            Order confirmation information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Order confirmation functionality will be implemented later */}
          <p className="text-sm text-muted-foreground">
            Order confirmation interface placeholder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
