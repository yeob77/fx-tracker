export type Currency = 'USD' | 'JPY';

export interface PurchaseLot {
  id: string; // 고유 ID (e.g., a timestamp or UUID)
  currency: Currency;
  purchaseDate: string; // ISO 8601 format date string
  purchasePrice: number; // 1단위 통화를 구매한 원화(KRW) 가격
  initialQuantity: number;
  remainingQuantity: number;
  memo?: string;
  fee?: number; // New: Optional fee for purchase
}

export interface SaleRecord {
  id: string;
  purchaseLotId: string; // 어떤 매수 묶음을 팔았는지 연결
  currency: Currency; // Added this line
  saleDate: string; // ISO 8601 format date string
  salePrice: number; // 1단위 통화를 판매한 원화(KRW) 가격
  quantity: number;
  realizedProfit: number; // 실현 손익 (KRW)
  fee?: number; // New: Optional fee for sale
}