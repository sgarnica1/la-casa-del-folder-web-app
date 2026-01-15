/**
 * API Client - placeholder for backend communication
 * All API calls will be implemented here
 */

import type { Draft, Layout, Product } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Draft endpoints
  async getDraft(draftId: string): Promise<Draft> {
    // Placeholder
    throw new Error('Not implemented');
  }

  async createDraft(productId: string, templateId: string): Promise<Draft> {
    // Placeholder
    throw new Error('Not implemented');
  }

  async updateDraft(draftId: string, updates: Partial<Draft>): Promise<Draft> {
    // Placeholder
    throw new Error('Not implemented');
  }

  async lockDraft(draftId: string): Promise<Draft> {
    // Placeholder
    throw new Error('Not implemented');
  }

  // Layout endpoints
  async getLayout(templateId: string): Promise<Layout> {
    // Placeholder
    throw new Error('Not implemented');
  }

  // Product endpoints
  async getProduct(productId: string): Promise<Product> {
    // Placeholder
    throw new Error('Not implemented');
  }

  // Image upload endpoints
  async uploadImage(file: File): Promise<{ id: string; url: string }> {
    // Placeholder
    throw new Error('Not implemented');
  }

  // Order endpoints
  async createOrder(draftId: string): Promise<{ orderId: string }> {
    // Placeholder
    throw new Error('Not implemented');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
