import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';

export interface CreatePaymentPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export class PaymentApi extends BaseApiClient {
  async createPreference(orderId: string): Promise<CreatePaymentPreferenceResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/payments/preference`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      return handleResponse<CreatePaymentPreferenceResponse>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
