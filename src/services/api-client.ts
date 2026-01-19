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
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMessage = errorData?.error?.message || errorData?.message || 'Request failed';
    throw new ApiError(errorMessage, response.status);
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
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokenGetter(getToken: () => Promise<string | null>): void {
    this.getToken = getToken;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {};

    if (this.getToken) {
      try {
        const token = await this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          console.warn('[ApiClient] No token available');
        }
      } catch (error) {
        console.error('[ApiClient] Error getting token:', error);
      }
    }

    return headers as HeadersInit;
  }

  async getDraft(draftId: string): Promise<Draft> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}`, {
        headers,
      });
      return handleResponse<Draft>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async createDraft(productId: string, templateId: string): Promise<Draft> {
    try {
      const headers = await this.getAuthHeaders() as Record<string, string>;
      const hasAuth = !!headers['Authorization'];
      console.log('[ApiClient] Creating draft', { hasAuth, productId, templateId });

      if (!hasAuth) {
        console.warn('[ApiClient] No authorization token available');
      }

      const response = await fetch(`${this.baseUrl}/drafts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, templateId }),
      });

      console.log('[ApiClient] Draft creation response:', response.status, response.statusText);
      return handleResponse<Draft>(response);
    } catch (error) {
      console.error('[ApiClient] Error in createDraft:', error);
      return handleFetchError(error);
    }
  }

  async updateDraft(draftId: string, updates: Partial<Draft>): Promise<Draft> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return handleResponse<Draft>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async lockDraft(draftId: string): Promise<Draft> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}/lock`, {
        method: 'POST',
        headers,
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
      const headers = await this.getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/assets`, {
        method: 'POST',
        headers,
        body: formData,
      });
      return handleResponse<{ id: string; url: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getImagesByIds(imageIds: string[]): Promise<Array<{ id: string; url: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const ids = imageIds.join(',');
      const response = await fetch(`${this.baseUrl}/assets?ids=${ids}`, {
        headers,
      });
      return handleResponse<Array<{ id: string; url: string }>>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async createOrder(draftId: string): Promise<{ orderId: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      return handleResponse<{ orderId: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getAllOrders(page = 1, limit = 20): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders?page=${page}&limit=${limit}`, {
        headers,
      });
      return handleResponse<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getOrderById(orderId: string): Promise<OrderDetail> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        headers,
      });
      return handleResponse<OrderDetail>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async updateOrderStatus(orderId: string, status: 'in_production' | 'shipped'): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: status }),
      });
      await handleResponse<void>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getCurrentUser(): Promise<{ id: string; clerkUserId: string; role: 'admin' | 'customer' }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me`, {
        headers,
      });
      return handleResponse<{ id: string; clerkUserId: string; role: 'admin' | 'customer' }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getMyDrafts(): Promise<Array<{ id: string; title: string | null; state: string; updatedAt: string; coverUrl: string | null }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/drafts`, {
        headers,
      });
      return handleResponse<Array<{ id: string; title: string | null; state: string; updatedAt: string; coverUrl: string | null }>>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getMyDraftById(draftId: string): Promise<Draft> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/drafts/${draftId}`, {
        headers,
      });
      const data = await handleResponse<{
        id: string;
        title: string | undefined;
        state: string;
        layoutItems: Array<{ id: string; slotId: string; imageId: string | null }>;
        imageIds: string[];
        createdAt: string;
        updatedAt: string;
      }>(response);

      return {
        id: data.id,
        status: data.state === 'editing' ? 'draft' : (data.state as 'locked' | 'ordered'),
        productId: '',
        templateId: '',
        title: data.title,
        layoutItems: data.layoutItems.map(item => ({
          id: item.id,
          slotId: item.slotId,
          imageId: item.imageId || undefined,
        })),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getMyOrders(): Promise<Array<{ id: string; status: string; total: number; createdAt: string; title: string | null; coverUrl: string | null }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/orders`, {
        headers,
      });
      return handleResponse<Array<{ id: string; status: string; total: number; createdAt: string; title: string | null; coverUrl: string | null }>>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getMyOrderById(orderId: string): Promise<OrderDetail> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/orders/${orderId}`, {
        headers,
      });
      return handleResponse<OrderDetail>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
