import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Wallet } from '@mercadopago/sdk-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton } from '@/components/ui';
import { Image } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import { useCart } from '@/contexts/CartContext';
import type { UserAddress, CreateAddressInput } from '@/services/api/user-api';
import type { Draft } from '@/types';

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, refreshCart } = useCart();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [isLoadingPreference, setIsLoadingPreference] = useState(false);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<Array<{ id: string; draftId: string; productId: string; productName: string; quantity: number; unitPrice: number }>>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [draftCoverUrls, setDraftCoverUrls] = useState<Record<string, string | null>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preferenceCreationRef = useRef<boolean>(false);
  const lastFormStateRef = useRef<boolean>(false);
  const toast = useToast();
  useApiClient();

  const [customerData, setCustomerData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  const [newAddress, setNewAddress] = useState<CreateAddressInput>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'México',
    isDefault: false,
  });

  // Auto-save user data with debounce
  const saveUserData = useCallback(async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    if (orderId) return; // Don't save if order already created

    const updates: { firstName?: string; lastName?: string; phone?: string } = {};
    if (data.firstName !== undefined && data.firstName !== '') {
      updates.firstName = data.firstName;
    }
    if (data.lastName !== undefined && data.lastName !== '') {
      updates.lastName = data.lastName;
    }
    if (data.phone !== undefined && data.phone !== '') {
      updates.phone = data.phone;
    }

    if (Object.keys(updates).length === 0) return;

    try {
      await apiClient.user.updateUserData(updates);
    } catch (err) {
      console.error('Failed to save user data:', err);
      // Don't show error toast for auto-save, it's background operation
    }
  }, [orderId]);

  useEffect(() => {
    const loadUserData = async () => {
      if (isUserLoaded && user) {
        try {
          // Load user data from API to get phone number from database
          const userData = await apiClient.user.getCurrentUser();
          setCustomerData({
            firstName: userData.firstName || user.firstName || '',
            lastName: userData.lastName || user.lastName || '',
            phone: userData.phone || user.primaryPhoneNumber?.phoneNumber || '',
            email: userData.email || user.primaryEmailAddress?.emailAddress || '',
          });
        } catch (err) {
          console.error('Failed to load user data:', err);
          // Fallback to Clerk data if API fails
          setCustomerData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.primaryPhoneNumber?.phoneNumber || '',
            email: user.primaryEmailAddress?.emailAddress || '',
          });
        }
      }
    };
    loadUserData();
  }, [user, isUserLoaded]);

  // Debounced auto-save when user stops typing
  useEffect(() => {
    if (orderId) return; // Don't auto-save if order already created

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveUserData({
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
      });
    }, 1000); // Wait 1 second after user stops typing

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [customerData.firstName, customerData.lastName, customerData.phone, orderId, saveUserData]);

  useEffect(() => {
    // Don't redirect if we already have an order (payment in progress)
    if (orderId) {
      return;
    }

    if (!cart || cart.items.length === 0) {
      navigate('/cart');
      return;
    }

    const loadData = async () => {
      try {
        const addressesData = await apiClient.user.getAddresses();
        setAddresses(addressesData);
        if (addressesData.length > 0) {
          const defaultAddress = addressesData.find(addr => addr.isDefault) || addressesData[0];
          setSelectedAddressId(defaultAddress.id);
        } else {
          setShowNewAddressForm(true);
        }
      } catch (err) {
        console.error('Failed to load addresses:', err);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    loadData();
  }, [cart, navigate, orderId]);

  // Load drafts for titles and cover images
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      return;
    }

    const loadDrafts = async () => {
      try {
        const uniqueDraftIds = [...new Set(cart.items.map(item => item.draftId))];

        // Fetch all drafts with cover URLs
        const allDrafts = await apiClient.drafts.getMyDrafts();
        const coverUrlMap: Record<string, string | null> = {};
        allDrafts.forEach(draft => {
          coverUrlMap[draft.id] = draft.coverUrl;
        });

        // Fetch individual drafts for titles and other data
        const draftResults = await Promise.all(
          uniqueDraftIds.map(async (draftId) => {
            try {
              const draft = await apiClient.drafts.getDraft(draftId);
              return { [draftId]: draft };
            } catch {
              return {};
            }
          })
        );
        const draftsMap = draftResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setDrafts(draftsMap);
        setDraftCoverUrls(coverUrlMap);
      } catch (err) {
        console.error('Failed to load drafts:', err);
      }
    };

    loadDrafts();
  }, [cart]);

  const isFormComplete = () => {
    // Check required customer fields
    if (!customerData.firstName || !customerData.lastName) {
      return false;
    }

    // Check phone number - must be exactly 10 digits
    if (!customerData.phone || customerData.phone.length !== 10) {
      return false;
    }

    // Check address - must have either selected address or complete new address form
    if (!selectedAddressId && !showNewAddressForm) {
      return false;
    }

    // If showing new address form, all required fields must be filled
    if (showNewAddressForm) {
      if (!newAddress.addressLine1 ||
        !newAddress.city ||
        !newAddress.state ||
        !newAddress.postalCode ||
        !newAddress.country) {
        return false;
      }
    }

    return true;
  };

  const handleCreateOrderAndPreference = async () => {
    if (!cart || cart.items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!isFormComplete()) {
      return;
    }

    if (orderId && preferenceId) {
      // Order and preference already created
      return;
    }

    setIsSubmitting(true);

    try {
      // Save user data if provided
      if (customerData.firstName || customerData.lastName || customerData.phone) {
        await saveUserData({
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
        });
      }

      // Create or get address
      let shippingAddressId: string | undefined;

      if (selectedAddressId && !showNewAddressForm) {
        shippingAddressId = selectedAddressId;
      } else if (showNewAddressForm) {
        if (!newAddress.addressLine1 || !newAddress.city || !newAddress.state || !newAddress.postalCode || !newAddress.country) {
          toast.error('Por favor completa todos los campos requeridos de la dirección');
          setIsSubmitting(false);
          return;
        }

        const createdAddress = await apiClient.user.createAddress(newAddress);
        shippingAddressId = createdAddress.id;
      } else {
        toast.error('Por favor selecciona o crea una dirección de envío');
        setIsSubmitting(false);
        return;
      }

      // Create order (will return existing if already exists)
      const order = await apiClient.cart.checkoutCart({
        shippingAddressId,
        shippingAddressData: shippingAddressId ? undefined : (showNewAddressForm ? {
          addressLine1: newAddress.addressLine1,
          addressLine2: newAddress.addressLine2 || undefined,
          city: newAddress.city,
          state: newAddress.state,
          postalCode: newAddress.postalCode,
          country: newAddress.country,
        } : undefined),
        customerData: {
          firstName: customerData.firstName || undefined,
          lastName: customerData.lastName || undefined,
          phone: customerData.phone || undefined,
        },
      });

      setOrderId(order.id);

      // Store order summary before cart is cleared
      setOrderTotal(cart.total);
      setOrderItems(cart.items.map(item => {
        const product = cart.products?.[item.productId];
        return {
          id: item.id,
          draftId: item.draftId,
          productId: item.productId,
          productName: product?.name || 'Producto',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        };
      }));

      // Create payment preference
      setIsLoadingPreference(true);
      try {
        const preferenceResponse = await apiClient.payments.createPreference(order.id);
        setPreferenceId(preferenceResponse.preferenceId);
      } catch (err) {
        console.error('Failed to create payment preference:', err);
        toast.error('No se pudo crear la preferencia de pago');
        setIsSubmitting(false);
        return;
      } finally {
        setIsLoadingPreference(false);
        setIsSubmitting(false);
      }

      await refreshCart();
    } catch (err) {
      toast.error(err);
      setIsSubmitting(false);
    }
  };

  // Auto-create order and preference when form becomes complete
  // Only trigger if user has actively filled the form (not just pre-filled data)
  useEffect(() => {
    const formIsComplete = isFormComplete();

    // Don't do anything if preference already exists and form is still complete
    if (preferenceId && formIsComplete) {
      lastFormStateRef.current = true;
      return;
    }

    // If form becomes incomplete after preference was created, reset preference
    // Only reset if form state actually changed from complete to incomplete
    if (preferenceId && !formIsComplete && lastFormStateRef.current) {
      setPreferenceId(null);
      setOrderId(null);
      lastFormStateRef.current = false;
      preferenceCreationRef.current = false;
      return;
    }

    // Only auto-create if form is complete and we haven't already created a preference
    // Check if at least one field has been manually changed (not just pre-filled)
    const hasUserInteraction = customerData.firstName || customerData.lastName || selectedAddressId || showNewAddressForm;

    if (formIsComplete && !preferenceId && !orderId && !isSubmitting && !preferenceCreationRef.current && cart && cart.items.length > 0 && hasUserInteraction) {
      preferenceCreationRef.current = true;
      lastFormStateRef.current = true;

      // Add a small delay to avoid creating order immediately on page load
      const timeoutId = setTimeout(() => {
        handleCreateOrderAndPreference().finally(() => {
          preferenceCreationRef.current = false;
        });
      }, 500);

      return () => {
        clearTimeout(timeoutId);
        preferenceCreationRef.current = false;
      };
    }

    // Update form state ref
    if (!formIsComplete) {
      lastFormStateRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerData.firstName, customerData.lastName, customerData.phone, selectedAddressId, showNewAddressForm, newAddress.addressLine1, newAddress.city, newAddress.state, newAddress.postalCode, newAddress.country, preferenceId]);

  // Memoize the Wallet component to prevent unnecessary re-renders
  // Only recreate when preferenceId changes, not when form fields change
  const walletComponent = useMemo(() => {
    const formComplete = isFormComplete();
    if (preferenceId && formComplete) {
      return (
        <div id="walletBrick_container" key={`wallet-${preferenceId}`}>
          <Wallet
            initialization={{ preferenceId }}
          />
        </div>
      );
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferenceId]); // Only recreate if preferenceId changes - form completion is checked inside

  // Only redirect if we haven't created an order yet
  if (!orderId && (!cart || cart.items.length === 0)) {
    navigate('/cart');
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nombre <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={customerData.firstName}
                        onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                        required
                        disabled={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Apellido <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={customerData.lastName}
                        onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                        required
                        disabled={false}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Teléfono <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => {
                        // Only allow numbers, max 10 digits
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setCustomerData({ ...customerData, phone: value });
                      }}
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="Ej: 5512345678"
                      required
                      disabled={false}
                    />
                    {customerData.phone && customerData.phone.length !== 10 && (
                      <p className="text-sm text-destructive mt-1">
                        El teléfono debe tener 10 dígitos
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={customerData.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dirección de Envío</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingAddresses ? (
                    <Skeleton className="h-32" />
                  ) : addresses.length > 0 && !showNewAddressForm ? (
                    <>
                      <div className="space-y-2">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50"
                          >
                            <input
                              type="radio"
                              name="address"
                              value={address.id}
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="mt-1"
                              disabled={false}
                            />
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground">
                                {address.addressLine1}
                                {address.addressLine2 && `, ${address.addressLine2}`}
                                <br />
                                {address.city}, {address.state} {address.postalCode}
                                <br />
                                {address.country}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowNewAddressForm(true);
                          setSelectedAddressId(null);
                        }}
                        disabled={false}
                      >
                        Agregar nueva dirección
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Dirección 1 <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={newAddress.addressLine1}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                          required
                          disabled={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Dirección 2 (opcional)</label>
                        <Input
                          value={newAddress.addressLine2 || ''}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                          disabled={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Ciudad <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          required
                          disabled={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Estado/Provincia <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          required
                          disabled={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Código Postal <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={newAddress.postalCode}
                          onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                          required
                          disabled={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          País <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={newAddress.country}
                          onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                          required
                          disabled={false}
                        />
                      </div>
                      {addresses.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewAddressForm(false);
                            if (addresses.length > 0) {
                              setSelectedAddressId(addresses[0].id);
                            }
                          }}
                          disabled={false}
                        >
                          Usar dirección existente
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {(orderItems.length > 0 ? orderItems : (cart?.items || [])).map((item) => {
                      const productName = 'productName' in item
                        ? item.productName
                        : (cart?.products?.[item.productId]?.name || 'Producto');
                      const draft = drafts[item.draftId];
                      const draftTitle = draft?.title || 'Sin título';
                      const coverUrl = draftCoverUrls[item.draftId];

                      return (
                        <div key={item.id} className="flex gap-4 items-start border-b pb-3">
                          <div className="w-16 h-16 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={draftTitle}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('svg')) {
                                    const icon = document.createElement('div');
                                    icon.className = 'w-full h-full flex items-center justify-center';
                                    icon.innerHTML = '<svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                    parent.appendChild(icon);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{productName}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {draftTitle}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Cantidad: {item.quantity}
                            </div>
                          </div>
                          <div className="font-medium flex-shrink-0">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(orderTotal ?? cart?.total ?? 0)}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {isLoadingPreference ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : walletComponent ? (
                      walletComponent
                    ) : (
                      <div className="opacity-50 pointer-events-none">
                        <div id="walletBrick_container_disabled">
                          <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
                            <p className="text-sm">Mercado Pago</p>
                            <p className="text-xs mt-1">Completa el formulario para habilitar el pago</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
