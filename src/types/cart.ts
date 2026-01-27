export interface Cart {
  id: string;
  userId: string;
  status: 'active' | 'converted';
  createdAt: string;
  updatedAt: string;
}

export interface SelectedOptionSnapshot {
  optionTypeId: string;
  optionTypeName: string;
  optionValueId: string;
  optionValueName: string;
  priceModifier: number | null;
}

export interface CartItem {
  id: string;
  cartId: string;
  draftId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  selectedOptionsSnapshot: SelectedOptionSnapshot[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartWithItems {
  cart: Cart | null;
  items: CartItem[];
  products?: Record<string, { id: string; name: string; description: string | null }>;
  total: number;
}
