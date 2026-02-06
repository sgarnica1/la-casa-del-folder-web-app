import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';

export interface UserAddress {
  id: string;
  userId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export class UserApi extends BaseApiClient {
  async getCurrentUser(): Promise<{ id: string; clerkUserId: string; role: 'admin' | 'customer'; firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me`, {
        headers,
      });
      return handleResponse<{ id: string; clerkUserId: string; role: 'admin' | 'customer'; firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async updateUserData(data: { firstName?: string; lastName?: string; phone?: string }): Promise<{ id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return handleResponse<{ id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string }>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async getAddresses(): Promise<UserAddress[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/addresses`, {
        headers,
      });
      return handleResponse<UserAddress[]>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }

  async createAddress(input: CreateAddressInput): Promise<UserAddress> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/addresses`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      return handleResponse<UserAddress>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
