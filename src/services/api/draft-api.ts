import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';
import type { Draft } from '@/types';

export class DraftApi extends BaseApiClient {
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

  async getMyDrafts(): Promise<Array<{ id: string; title: string | null; state: string; updatedAt: string; coverUrl: string | null; productName: string | null }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user/me/drafts`, {
        headers,
      });
      return handleResponse<Array<{ id: string; title: string | null; state: string; updatedAt: string; coverUrl: string | null; productName: string | null }>>(response);
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
}
