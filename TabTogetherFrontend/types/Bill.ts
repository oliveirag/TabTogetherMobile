export interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // participant IDs
  isSharedEqually: boolean;
  ocrConfidence: number;
  category?: string;
}

export interface Participant {
  id: string;
  name: string;
  totalOwed: number;
  assignedItems: string[]; // item IDs
  taxOwed: number;
  tipOwed: number;
  isPayer: boolean;
}

export interface Receipt {
  id: string;
  timestamp: Date;
  imageUrl: string;
  originalImagePath: string;
  totalAmount: number;
  taxAmount: number;
  tipAmount: number;
  detectedTip: number;
  manualTip: number;
  tipPercentage?: number;
  items: Item[];
  participants: Participant[];
  splitMethod: 'individual' | 'equal' | 'mixed';
  isProcessed: boolean;
  ocrConfidence: number;
  userId?: string; // null for local-only usage
  venue?: string; // Restaurant/store name
  notes?: string;
}

export interface ParticipantSummary {
  name: string;
  itemsTotal: number;
  taxOwed: number;
  tipOwed: number;
  totalOwed: number;
  itemBreakdown: ItemDetail[];
}

export interface ItemDetail {
  name: string;
  price: number;
  quantity: number;
}

export interface CalculationResult {
  receiptId: string;
  participants: ParticipantSummary[];
  totalVerification: {
    calculatedTotal: number;
    originalTotal: number;
    isAccurate: boolean;
  };
  generatedAt: Date;
}

export interface BillHistoryItem {
  id: string;
  date: Date;
  venue: string;
  totalAmount: number;
  participantCount: number;
  imageUri: string;
  status: 'processed' | 'pending' | 'error';
  receipt: Receipt;
} 