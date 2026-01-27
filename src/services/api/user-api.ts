import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';

export class UserApi extends BaseApiClient {
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
}
