import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';

export class AssetApi extends BaseApiClient {
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
}
