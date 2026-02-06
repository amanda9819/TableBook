-- Seed canonical cuisine values
-- Run this manually via Supabase SQL Editor after deploying the schema.

INSERT INTO cuisines (name) VALUES
  ('American'),
  ('Mexican'),
  ('Italian'),
  ('Chinese'),
  ('Japanese'),
  ('Korean'),
  ('Thai'),
  ('Vietnamese'),
  ('Indian'),
  ('Mediterranean'),
  ('Greek'),
  ('French'),
  ('Spanish'),
  ('Middle Eastern'),
  ('Ethiopian'),
  ('Cajun'),
  ('Caribbean'),
  ('Brazilian'),
  ('Peruvian'),
  ('Hawaiian'),
  ('Seafood'),
  ('BBQ'),
  ('Pizza'),
  ('Sushi'),
  ('Vegan/Vegetarian'),
  ('Bakery/Cafe')
ON CONFLICT (name) DO NOTHING;
