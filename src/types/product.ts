/**
 * Product type - defines product information
 * For MVP: exactly ONE product
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
}
