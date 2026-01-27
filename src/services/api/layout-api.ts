import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';
import type { Layout } from '@/types';

export class LayoutApi extends BaseApiClient {
  async getLayout(templateId: string): Promise<Layout> {
    try {
      const response = await fetch(`${this.baseUrl}/layouts/${templateId}`);
      return handleResponse<Layout>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
