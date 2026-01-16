import type { Draft, Layout, Product, Order, OrderDetail } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(error.message || 'Request failed', response.status);
  }
  return response.json();
}

async function handleFetchError(error: unknown): Promise<never> {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    throw new ApiError(
      'No se pudo conectar con el servidor. Asegúrate de que el backend esté ejecutándose en http://localhost:3000',
      0
    );
  }

  throw new ApiError(
    error instanceof Error ? error.message : 'Error desconocido',
    0
  );
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getDraft(draftId: string): Promise<Draft> {
    try {
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}`);
      return handleResponse<Draft>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async createDraft(productId: string, templateId: string): Promise<Draft> {
    try {
      const response = await fetch(`${this.baseUrl}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, templateId }),
      });
      return handleResponse<Draft>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async updateDraft(draftId: string, updates: Partial<Draft>): Promise<Draft> {
    try {
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return handleResponse<Draft>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async lockDraft(draftId: string): Promise<Draft> {
    try {
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}/lock`, {
        method: 'POST',
      });
      return handleResponse<Draft>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getLayout(templateId: string): Promise<Layout> {
    try {
      const response = await fetch(`${this.baseUrl}/layouts/${templateId}`);
      return handleResponse<Layout>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${productId}`);
      return handleResponse<Product>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async uploadImage(file: File): Promise<{ id: string; url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/assets`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse<{ id: string; url: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getImagesByIds(imageIds: string[]): Promise<Array<{ id: string; url: string }>> {
    try {
      const ids = imageIds.join(',');
      const response = await fetch(`${this.baseUrl}/assets?ids=${ids}`);
      return handleResponse<Array<{ id: string; url: string }>>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async createOrder(draftId: string): Promise<{ orderId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      return handleResponse<{ orderId: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`);
      return handleResponse<Order[]>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getOrderById(orderId: string): Promise<OrderDetail> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`);
      return handleResponse<OrderDetail>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
