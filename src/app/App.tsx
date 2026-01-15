import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { UploadPage } from '@/features/editor/pages/UploadPage';
import { EditorPage } from '@/features/editor/pages/EditorPage';
import { PreviewPage } from '@/features/editor/pages/PreviewPage';
import { OrderConfirmationPage } from '@/features/order/pages/OrderConfirmationPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
