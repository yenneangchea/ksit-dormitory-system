-- Smart Utility Subsidies: preserve historical generated values, then store
-- future quota-aware totals and transparent usage breakdowns per utility bill.
SET lock_timeout = '5s';

ALTER TABLE public.utility_bills
  ADD COLUMN IF NOT EXISTS electricity_used_kwh NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_electricity_kwh NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS subsidized_electricity_kwh NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chargeable_electricity_kwh NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS water_used_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_water_m3 NUMERIC NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS subsidized_water_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chargeable_water_m3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subsidy_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- The old totals were generated from raw readings only. Converting them to
-- stored fields preserves historical values while allowing quota-aware totals
-- for all new bills.
ALTER TABLE public.utility_bills
  ALTER COLUMN total_electric_cost_khr DROP EXPRESSION,
  ALTER COLUMN total_water_cost_khr DROP EXPRESSION,
  ALTER COLUMN total_amount_khr DROP EXPRESSION;

ALTER TABLE public.utility_bills
  ALTER COLUMN total_electric_cost_khr SET DEFAULT 0,
  ALTER COLUMN total_water_cost_khr SET DEFAULT 0,
  ALTER COLUMN total_amount_khr SET DEFAULT 0;
