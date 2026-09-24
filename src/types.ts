export type CalculationType = 'arithmetic' | 'conversion';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  customerName: string;
  utr: string; // 12-digit UPI reference number
  vpa: string;
  payeeName: string;
  note: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  timestamp: number;
  source: 'gpay' | 'upi' | 'webhook' | 'manual';
}

export interface HistoryItem {
  id: string;
  type: CalculationType;
  expression: string;
  result: string;
  timestamp: number;
  details?: string;
  category?: string;
}

export type UnitCategoryKey =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'volume'
  | 'area'
  | 'speed'
  | 'time'
  | 'digital';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  // Conversion relative to a base unit in that category
  toBase?: (val: number) => number;
  fromBase?: (val: number) => number;
  ratio?: number; // ratio to base unit if linear (base = val * ratio)
}

export interface UnitCategory {
  id: UnitCategoryKey;
  name: string;
  baseUnit: string;
  units: UnitDefinition[];
}
