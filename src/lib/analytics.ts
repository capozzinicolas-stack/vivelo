/**
 * GA4 + Meta Pixel ecommerce event helpers.
 * Each function fires both gtag() and fbq() if available.
 * Safe to call even if analytics scripts aren't loaded (guards with typeof checks).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  base_price: number;
}

interface CartItemForAnalytics {
  service_id: string;
  service_snapshot: {
    title: string;
    category: string;
    base_price: number;
    provider_name: string;
  };
  total: number;
  guest_count: number;
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

export function trackViewItem(service: ServiceItem) {
  gtag('event', 'view_item', {
    currency: 'MXN',
    value: service.base_price,
    items: [{
      item_id: service.id,
      item_name: service.title,
      item_category: service.category,
      price: service.base_price,
    }],
  });

  fbq('track', 'ViewContent', {
    content_ids: [service.id],
    content_name: service.title,
    content_category: service.category,
    content_type: 'product',
    value: service.base_price,
    currency: 'MXN',
  });
}

export function trackAddToCart(item: CartItemForAnalytics) {
  gtag('event', 'add_to_cart', {
    currency: 'MXN',
    value: item.total,
    items: [{
      item_id: item.service_id,
      item_name: item.service_snapshot.title,
      item_category: item.service_snapshot.category,
      price: item.total,
      quantity: 1,
    }],
  });

  fbq('track', 'AddToCart', {
    content_ids: [item.service_id],
    content_name: item.service_snapshot.title,
    content_type: 'product',
    value: item.total,
    currency: 'MXN',
  });
}

export function trackBeginCheckout(items: CartItemForAnalytics[], total: number) {
  gtag('event', 'begin_checkout', {
    currency: 'MXN',
    value: total,
    items: items.map(item => ({
      item_id: item.service_id,
      item_name: item.service_snapshot.title,
      item_category: item.service_snapshot.category,
      price: item.total,
      quantity: 1,
    })),
  });

  fbq('track', 'InitiateCheckout', {
    content_ids: items.map(i => i.service_id),
    num_items: items.length,
    value: total,
    currency: 'MXN',
  });
}

export function trackPurchase(orderId: string, items: CartItemForAnalytics[], total: number) {
  gtag('event', 'purchase', {
    transaction_id: orderId,
    currency: 'MXN',
    value: total,
    items: items.map(item => ({
      item_id: item.service_id,
      item_name: item.service_snapshot.title,
      item_category: item.service_snapshot.category,
      price: item.total,
      quantity: 1,
    })),
  });

  fbq('track', 'Purchase', {
    content_ids: items.map(i => i.service_id),
    content_type: 'product',
    num_items: items.length,
    value: total,
    currency: 'MXN',
  });
}
