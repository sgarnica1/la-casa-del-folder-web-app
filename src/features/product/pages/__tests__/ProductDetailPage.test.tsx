import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductDetailPage } from '../ProductDetailPage';
import { apiClient } from '@/services/api-client';

vi.mock('@/services/api-client', () => ({
  apiClient: {
    drafts: {
      createDraft: vi.fn(),
    },
    layouts: {},
    cart: {},
    orders: {},
    assets: {},
    products: {},
    user: {},
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.drafts.createDraft).mockResolvedValue({
      id: 'draft-1',
      status: 'draft',
      productId: 'calendar',
      templateId: 'calendar-template',
      layoutItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should render product detail page', () => {
    render(<ProductDetailPage />, { wrapper });
    expect(screen.getByText(/calendario personalizado/i)).toBeInTheDocument();
    expect(screen.getByText(/personalizar/i)).toBeInTheDocument();
  });
});
