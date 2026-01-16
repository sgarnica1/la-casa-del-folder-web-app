import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ProductDetailPage } from '@/features/product/pages/ProductDetailPage';
import { UploadPage } from '@/features/editor/pages/UploadPage';
import { EditorPage } from '@/features/editor/pages/EditorPage';
import { PreviewPage } from '@/features/editor/pages/PreviewPage';
import { OrderConfirmationPage } from '@/features/order/pages/OrderConfirmationPage';
import { OrdersListPage } from '@/features/dashboard/pages/OrdersListPage';
import { OrderDetailPage } from '@/features/dashboard/pages/OrderDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/product/calendar" replace />} />
          <Route path="/product/calendar" element={<ProductDetailPage />} />
          <Route path="/draft/:draftId/upload" element={<UploadPage />} />
          <Route path="/draft/:draftId/edit" element={<EditorPage />} />
          <Route path="/draft/:draftId/preview" element={<PreviewPage />} />
          <Route path="/draft/:draftId/confirm" element={<OrderConfirmationPage />} />
          <Route path="/dashboard/orders" element={<OrdersListPage />} />
          <Route path="/dashboard/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
