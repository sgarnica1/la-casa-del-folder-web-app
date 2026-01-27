import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';
import type { Product } from '@/types';

export class ProductApi extends BaseApiClient {
  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${productId}`);
      return handleResponse<Product>(response);
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
