import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OrderConfirmationPage } from '../OrderConfirmationPage';
import { apiClient } from '@/services/api-client';

vi.mock('@/services/api-client', () => ({
  apiClient: {
    drafts: {
      getDraft: vi.fn(),
    },
    layouts: {},
    cart: {
      getCart: vi.fn(),
    },
    orders: {},
    assets: {},
    products: {
      getProduct: vi.fn(),
    },
    user: {},
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('OrderConfirmationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.drafts.getDraft).mockResolvedValue({
      id: 'draft-1',
      status: 'locked',
      productId: 'calendar',
      templateId: 'calendar-template',
      layoutItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lockedAt: new Date().toISOString(),
    });
    vi.mocked(apiClient.products.getProduct).mockResolvedValue({
      id: 'calendar',
      name: 'Calendario Personalizado',
      description: 'Test calendar',
      basePrice: 500,
      currency: 'MXN',
    });
    vi.mocked(apiClient.cart.getCart).mockResolvedValue({
      cart: null,
      items: [],
      total: 0,
    });
  });

  it('should render order confirmation page', () => {
    render(<OrderConfirmationPage />, { wrapper });
    expect(screen.getByText(/confirmar pedido/i)).toBeInTheDocument();
  });
});
