export type PantryItem = {
  id: string;
  user_id: string;
  canonical_name: string;
  display_name: string;

  quantity: number;
  unit: string;
  location: string;

  purchase_date: string | null;
  expiry_date: string | null;

  barcode: string | null;
  price_paid: number | null;
  currency: string | null;

  created_at: string;
  updated_at: string;
};