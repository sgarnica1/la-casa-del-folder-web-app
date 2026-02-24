export type OrderStatus = "new" | "in_production" | "ready" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface Order {
  id: string;
  userId: string;
  totalAmount: string;
  paymentStatus: "pending" | "paid" | "failed";
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface OrderAddress {
  name: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  priceSnapshot: string;
  designSnapshotJson: DesignSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends Order {
  shippingAddressJson: Record<string, unknown>;
  customer: OrderCustomer;
  address: OrderAddress | null;
  items: OrderItem[];
}

export interface DesignSnapshot {
  draftId: string;
  productId: string;
  templateId: string | null;
  title: string | null;
  layoutItems: DesignSnapshotLayoutItem[];
}

export interface DesignSnapshotLayoutItem {
  layoutIndex: number;
  type: "image" | "text";
  transformJson: Record<string, unknown> | null;
  images: DesignSnapshotImage[];
}

export interface DesignSnapshotImage {
  cloudinaryPublicId: string;
  secureUrl: string;
  width: number;
  height: number;
  transform: Record<string, unknown> | null;
  uploadedImageId?: string;
}

export enum OrderActivityType {
  ORDER_PLACED = "ORDER_PLACED",
  PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
  ORDER_IN_PRODUCTION = "ORDER_IN_PRODUCTION",
  ORDER_READY = "ORDER_READY",
  ORDER_SHIPPED = "ORDER_SHIPPED",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  STATUS_CHANGED = "STATUS_CHANGED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  ORDER_REFUNDED = "ORDER_REFUNDED",
}

export interface OrderStatusTransition {
  targetStatus: OrderStatus;
  requiresNote: boolean;
  requiresPaymentStatus?: "pending" | "paid" | "failed";
  label: string;
}

export interface OrderActivity {
  id: string;
  orderId: string;
  activityType: OrderActivityType;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}