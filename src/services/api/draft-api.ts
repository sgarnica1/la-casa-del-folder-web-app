import { BaseApiClient } from './base-api-client';
import { handleResponse, handleFetchError } from './base-api-client';
import type { Draft, DraftStatus } from '@/types';

export class DraftApi extends BaseApiClient {
  async getDraft(draftId: string): Promise<Draft> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/drafts/${draftId}`, {
        headers,
      });
      const data = await handleResponse<{
        id: string;
        status: string;
        productId: string;
        templateId: string;
        title: string | null;
        layoutItems: Array<{ 
          id: string; 
          slotId: string; 
          imageId: string | null;
          transform?: { x: number; y: number; scale: number; rotation: number } | null;
        }>;
        createdAt: string;
        updatedAt: string;
      }>(response);
      
      const mappedDraft = {
        id: data.id,
        status: data.status as 'draft' | 'locked' | 'ordered',
        productId: data.productId,
        templateId: data.templateId,
        title: data.title || undefined,
        layoutItems: data.layoutItems.map(item => ({
          id: item.id,
          slotId: item.slotId,
          imageId: item.imageId || undefined,
          transform: item.transform || undefined,
        })),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      console.log('[DraftApi] getDraft response mapped:', {
        draftId,
        rawData: {
          ...data,
          layoutItems: data.layoutItems.map(item => ({
            id: item.id,
            slotId: item.slotId,
            imageId: item.imageId,
            transform: item.transform,
          })),
        },
        mappedDraft: {
          ...mappedDraft,
          layoutItems: mappedDraft.layoutItems.map(item => ({
            id: item.id,
            slotId: item.slotId,
            imageId: item.imageId,
            transform: item.transform ? {
              x: item.transform.x,
              y: item.transform.y,
              scale: item.transform.scale,
              rotation: item.transform.rotation,
            } : null,
          })),
        },
      });

      return mappedDraft;
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
        layoutItems: Array<{ 
          id: string; 
          slotId: string; 
          imageId: string | null;
          transform?: { x: number; y: number; scale: number; rotation: number } | null;
        }>;
        imageIds: string[];
        createdAt: string;
        updatedAt: string;
      }>(response);

      const mappedDraft: Draft = {
        id: data.id,
        status: (data.state === 'editing' ? 'draft' : (data.state === 'locked' ? 'locked' : 'ordered')) as DraftStatus,
        productId: '',
        templateId: '',
        title: data.title,
        layoutItems: data.layoutItems.map(item => ({
          id: item.id,
          slotId: item.slotId,
          imageId: item.imageId || undefined,
          transform: item.transform || undefined,
        })),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      console.log('[DraftApi] getMyDraftById response mapped:', {
        draftId,
        rawData: {
          ...data,
          layoutItems: data.layoutItems.map(item => ({
            id: item.id,
            slotId: item.slotId,
            imageId: item.imageId,
            transform: item.transform,
          })),
        },
        mappedDraft: {
          ...mappedDraft,
          layoutItems: mappedDraft.layoutItems.map(item => ({
            id: item.id,
            slotId: item.slotId,
            imageId: item.imageId,
            transform: item.transform ? {
              x: item.transform.x,
              y: item.transform.y,
              scale: item.transform.scale,
              rotation: item.transform.rotation,
            } : null,
          })),
        },
      });

      return mappedDraft;
    } catch (error) {
      return handleFetchError(error);
    }
  }
}
