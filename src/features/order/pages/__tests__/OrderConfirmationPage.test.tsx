import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OrderConfirmationPage } from '../OrderConfirmationPage';
import { apiClient } from '@/services/api-client';

vi.mock('@/services/api-client');

const mockApiClient = vi.mocked(apiClient);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('OrderConfirmationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.getDraft.mockResolvedValue({
      id: 'draft-1',
      status: 'locked',
      productId: 'calendar',
      templateId: 'calendar-template',
      layoutItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lockedAt: new Date().toISOString(),
    });
  });

  it('should render order confirmation page', () => {
    render(<OrderConfirmationPage />, { wrapper });
    expect(screen.getByText(/confirmar pedido/i)).toBeInTheDocument();
  });
});
