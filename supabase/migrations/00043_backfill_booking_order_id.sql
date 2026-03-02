-- ============================================================
-- Migration 00043: Backfill order_id on bookings
-- ============================================================
-- Fix: createBooking() was not persisting order_id, causing
-- Stripe refunds to silently skip (no PI to refund against).
-- This migration links orphaned bookings to their orders.

-- Strategy 1: Match via shared stripe_payment_intent_id
-- (set by webhook on both tables)
UPDATE bookings b
SET order_id = o.id
FROM orders o
WHERE b.order_id IS NULL
  AND b.stripe_payment_intent_id IS NOT NULL
  AND o.stripe_payment_intent_id IS NOT NULL
  AND b.stripe_payment_intent_id = o.stripe_payment_intent_id;

-- Strategy 2: Match by client_id + close creation timing (within 5 min)
-- Only updates where exactly one order matches to avoid ambiguity
UPDATE bookings b
SET order_id = sub.order_id
FROM (
  SELECT DISTINCT ON (booking_id) booking_id, order_id
  FROM (
    SELECT b2.id AS booking_id, o2.id AS order_id,
           COUNT(*) OVER (PARTITION BY b2.id) AS match_count
    FROM bookings b2
    JOIN orders o2 ON b2.client_id = o2.client_id
    WHERE b2.order_id IS NULL
      AND b2.created_at >= o2.created_at
      AND b2.created_at <= o2.created_at + INTERVAL '5 minutes'
  ) matched
  WHERE match_count = 1
) sub
WHERE b.id = sub.booking_id;
