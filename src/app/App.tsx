import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DraftEditorLayout } from '@/components/layout/DraftEditorLayout';
import { ProductDetailPage } from '@/features/product/pages/ProductDetailPage';
import { UploadPage } from '@/features/editor/pages/UploadPage';
import { EditorPage } from '@/features/editor/pages/EditorPage';
import { PreviewPage } from '@/features/editor/pages/PreviewPage';
import { OrderConfirmationPage } from '@/features/order/pages/OrderConfirmationPage';
import { DashboardLoginPage } from '@/features/dashboard/pages/DashboardLoginPage';
import { OrdersListPage } from '@/features/dashboard/pages/OrdersListPage';
import { OrderDetailPage } from '@/features/dashboard/pages/OrderDetailPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotFoundPage } from '@/components/NotFoundPage';
import { UserRole } from '@/types';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/product/calendar" replace />} />
        <Route
          path="/product/calendar"
          element={
            <PublicLayout>
              <ProductDetailPage />
            </PublicLayout>
          }
        />
        <Route
          path="/draft/:draftId/upload"
          element={
            <DraftEditorLayout>
              <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
                <UploadPage />
              </ProtectedRoute>
            </DraftEditorLayout>
          }
        />
        <Route
          path="/draft/:draftId/edit"
          element={
            <DraftEditorLayout>
              <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
                <EditorPage />
              </ProtectedRoute>
            </DraftEditorLayout>
          }
        />
        <Route
          path="/draft/:draftId/preview"
          element={
            <DraftEditorLayout>
              <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
                <PreviewPage />
              </ProtectedRoute>
            </DraftEditorLayout>
          }
        />
        <Route
          path="/draft/:draftId/confirm"
          element={
            <DraftEditorLayout>
              <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
                <OrderConfirmationPage />
              </ProtectedRoute>
            </DraftEditorLayout>
          }
        />
        <Route
          path="/dashboard"
          element={<DashboardLoginPage />}
        />
        <Route
          path="/dashboard/orders"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <DashboardLayout>
                <OrdersListPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/orders/:id"
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <DashboardLayout>
                <OrderDetailPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFoundPage />
            </PublicLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
