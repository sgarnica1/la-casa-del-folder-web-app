import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';
import type { Order, OrderDetail, OrderActivity } from '@/types';

export class OrderApi extends BaseApiClient {
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

  async getMyOrders(): Promise<Array<{ id: string; status: string; total: number; createdAt: string; title: string | null; coverUrl: string | null; productName: string | null }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/orders`, {
        headers,
      });
      return handleResponse<Array<{ id: string; status: string; total: number; createdAt: string; title: string | null; coverUrl: string | null; productName: string | null }>>(response);
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

  async getOrderActivities(orderId: string): Promise<OrderActivity[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/activities`, {
        headers,
      });
      const data = await handleResponse<{ activities: OrderActivity[] }>(response);
      return data.activities;
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
