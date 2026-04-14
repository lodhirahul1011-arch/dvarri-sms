/*
  # SMS Delivery Tool - Create Tables

  ## New Tables

  ### phone_numbers
  - Stores the saved phone number for SMS delivery
  - id: unique identifier
  - number: phone number (10 digit Indian mobile)
  - label: optional label for the number
  - is_active: marks which number is currently active
  - created_at: timestamp

  ### sms_logs
  - Stores all sent SMS records with generated values
  - id: unique identifier
  - phone_number: recipient phone number
  - button_label: which delivery button was clicked (Delivery 1-5)
  - order_id: randomly generated order ID (OD + 11 digits)
  - awb: randomly generated AWB number (FMPP + 11 digits)
  - otp: randomly generated OTP (4 or 6 digits)
  - time_slot: randomly generated delivery time slot
  - message_text: full SMS message text
  - status: sent/failed/pending
  - api_response: raw API response from SMS provider
  - created_at: timestamp

  ## Security
  - RLS enabled on both tables
  - No anon policies - only service role (edge function) can access
*/

CREATE TABLE IF NOT EXISTS phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  label text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  button_label text NOT NULL,
  order_id text NOT NULL,
  awb text NOT NULL,
  otp text NOT NULL,
  time_slot text NOT NULL,
  message_text text NOT NULL,
  status text DEFAULT 'pending',
  api_response jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sms_logs_created_at_idx ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS phone_numbers_is_active_idx ON phone_numbers(is_active);
