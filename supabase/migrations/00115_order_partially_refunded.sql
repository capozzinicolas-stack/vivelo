-- C3 FIX: Add 'partially_refunded' to order_status enum
-- When some bookings in an order are cancelled/refunded but not all,
-- the order should reflect this intermediate state.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_refunded';
