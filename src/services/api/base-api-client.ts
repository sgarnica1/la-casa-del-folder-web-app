export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMessage = errorData?.error?.message || errorData?.message || 'Request failed';
    throw new ApiError(errorMessage, response.status);
  }
  return response.json();
}

export async function handleFetchError(error: unknown): Promise<never> {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    throw new ApiError(
      'No se pudo conectar con el servidor. Asegúrate de que el backend esté ejecutándose en http://localhost:3000',
      0
    );
  }

  throw new ApiError(
    error instanceof Error ? error.message : 'Error desconocido',
    0
  );
}

export class BaseApiClient {
  protected baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokenGetter(getToken: () => Promise<string | null>): void {
    this.getToken = getToken;
  }

  protected async getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {};

    if (this.getToken) {
      try {
        const token = await this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          console.warn('[ApiClient] No token available');
        }
      } catch (error) {
        console.error('[ApiClient] Error getting token:', error);
      }
    }

    return headers as HeadersInit;
  }
}
