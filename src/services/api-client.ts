import { BaseApiClient, ApiError } from './api/base-api-client';
import { CartApi } from './api/cart-api';
import { DraftApi } from './api/draft-api';
import { OrderApi } from './api/order-api';
import { AssetApi } from './api/asset-api';
import { ProductApi } from './api/product-api';
import { LayoutApi } from './api/layout-api';
import { UserApi } from './api/user-api';
import { PaymentApi } from './api/payment-api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient extends BaseApiClient {
  public cart: CartApi;
  public drafts: DraftApi;
  public orders: OrderApi;
  public assets: AssetApi;
  public products: ProductApi;
  public layouts: LayoutApi;
  public user: UserApi;
  public payments: PaymentApi;

  constructor(baseUrl: string) {
    super(baseUrl);
    this.cart = new CartApi(baseUrl);
    this.drafts = new DraftApi(baseUrl);
    this.orders = new OrderApi(baseUrl);
    this.assets = new AssetApi(baseUrl);
    this.products = new ProductApi(baseUrl);
    this.layouts = new LayoutApi(baseUrl);
    this.user = new UserApi(baseUrl);
    this.payments = new PaymentApi(baseUrl);
  }

  setTokenGetter(getToken: () => Promise<string | null>): void {
    super.setTokenGetter(getToken);
    this.cart.setTokenGetter(getToken);
    this.drafts.setTokenGetter(getToken);
    this.orders.setTokenGetter(getToken);
    this.assets.setTokenGetter(getToken);
    this.products.setTokenGetter(getToken);
    this.layouts.setTokenGetter(getToken);
    this.user.setTokenGetter(getToken);
    this.payments.setTokenGetter(getToken);
  }

}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
