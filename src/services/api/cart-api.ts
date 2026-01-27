import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';
import type { CartWithItems, CartItem } from '@/types/cart';

export class CartApi extends BaseApiClient {
  async getCart(): Promise<CartWithItems> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/cart`, {
        headers,
      });
      return handleResponse<CartWithItems>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async addCartItem(draftId: string): Promise<CartItem> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/cart/items`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftId }),
      });
      return handleResponse<CartItem>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async updateCartItemQuantity(cartItemId: string, quantity: number): Promise<CartItem> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/cart/items/${cartItemId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });
      return handleResponse<CartItem>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async removeCartItem(cartItemId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData?.error?.message || errorData?.message || 'Request failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async checkoutCart(): Promise<{ id: string; draftId: string; state: string; createdAt: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/cart/checkout`, {
        method: 'POST',
        headers,
      });
      return handleResponse<{ id: string; draftId: string; state: string; createdAt: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
