import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EditorPage } from '../EditorPage';
import { UploadedImagesProvider } from '@/contexts/UploadedImagesContext';
import { apiClient } from '@/services/api-client';

vi.mock('@/services/api-client', () => ({
  apiClient: {
    drafts: {
      getDraft: vi.fn(),
    },
    layouts: {
      getLayout: vi.fn(),
    },
    cart: {},
    orders: {},
    assets: {},
    products: {},
    user: {},
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <UploadedImagesProvider>{children}</UploadedImagesProvider>
  </BrowserRouter>
);

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.drafts.getDraft).mockResolvedValue({
      id: 'draft-1',
      status: 'draft',
      productId: 'calendar',
      templateId: 'calendar-template',
      layoutItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(apiClient.layouts.getLayout).mockResolvedValue({
      id: 'layout-1',
      templateId: 'calendar-template',
      slots: [
        { id: 'slot-1', name: 'Enero', required: true, bounds: { x: 0, y: 0, width: 100, height: 100 } },
      ],
    });
  });

  it('should render editor page', () => {
    render(<EditorPage />, { wrapper });
    expect(screen.getByText(/asignar fotos/i)).toBeInTheDocument();
  });
});
