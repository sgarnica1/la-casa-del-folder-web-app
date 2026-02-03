import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DraftEditorLayout } from '@/components/layout/DraftEditorLayout';
import { ProductDetailPage } from '@/features/product/pages/ProductDetailPage';
import { UploadPage } from '@/features/editor/pages/UploadPage';
import { EditorPage } from '@/features/editor/pages/EditorPage';
import { OrderConfirmationPage } from '@/features/order/pages/OrderConfirmationPage';
import { CartPage } from '@/features/order/pages/CartPage';
import { PaymentPage } from '@/features/order/pages/PaymentPage';
import { PaymentConfirmedPage } from '@/features/order/pages/PaymentConfirmedPage';
import { PaymentSuccessPage } from '@/features/order/pages/PaymentSuccessPage';
import { PaymentFailurePage } from '@/features/order/pages/PaymentFailurePage';
import { PaymentPendingPage } from '@/features/order/pages/PaymentPendingPage';
import { DashboardLoginPage } from '@/features/dashboard/pages/DashboardLoginPage';
import { OrdersListPage } from '@/features/dashboard/pages/OrdersListPage';
import { OrderDetailPage } from '@/features/dashboard/pages/OrderDetailPage';
import { MyDraftsPage } from '@/features/user/pages/MyDraftsPage';
import { MyDraftDetailPage } from '@/features/user/pages/MyDraftDetailPage';
import { MyOrdersPage } from '@/features/user/pages/MyOrdersPage';
import { MyOrderDetailPage } from '@/features/user/pages/MyOrderDetailPage';
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
          path="/cart"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/confirmed"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PaymentConfirmedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/success"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/failure"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PaymentFailurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/pending"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PaymentPendingPage />
            </ProtectedRoute>
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
          path="/account/my-designs"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PublicLayout>
                <MyDraftsPage />
              </PublicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/my-designs/:id"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PublicLayout>
                <MyDraftDetailPage />
              </PublicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/order/history"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PublicLayout>
                <MyOrdersPage />
              </PublicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/order/:id"
          element={
            <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
              <PublicLayout>
                <MyOrderDetailPage />
              </PublicLayout>
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
