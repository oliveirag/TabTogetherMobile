import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillHistoryItem, Receipt } from '../types/Bill';

const BILLS_STORAGE_KEY = '@TabTogether:bills';
const SETTINGS_STORAGE_KEY = '@TabTogether:settings';

export class BillStorageService {
  private static instance: BillStorageService;
  private bills: BillHistoryItem[] = [];
  private isLoaded = false;

  static getInstance(): BillStorageService {
    if (!BillStorageService.instance) {
      BillStorageService.instance = new BillStorageService();
    }
    return BillStorageService.instance;
  }

  private async loadBills(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const billsJson = await AsyncStorage.getItem(BILLS_STORAGE_KEY);
      if (billsJson) {
        const bills = JSON.parse(billsJson);
        // Convert date strings back to Date objects
        this.bills = bills.map((bill: any) => ({
          ...bill,
          date: new Date(bill.date),
          receipt: {
            ...bill.receipt,
            timestamp: new Date(bill.receipt.timestamp),
          },
        }));
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading bills from storage:', error);
      this.bills = [];
      this.isLoaded = true;
    }
  }

  private async saveBills(): Promise<void> {
    try {
      await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(this.bills));
    } catch (error) {
      console.error('Error saving bills to storage:', error);
      throw error;
    }
  }

  async getAllBills(): Promise<BillHistoryItem[]> {
    await this.loadBills();
    return [...this.bills].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getBillById(id: string): Promise<BillHistoryItem | null> {
    await this.loadBills();
    return this.bills.find(bill => bill.id === id) || null;
  }

  async saveBill(receipt: Receipt, imageUri: string): Promise<BillHistoryItem> {
    await this.loadBills();

    const billHistoryItem: BillHistoryItem = {
      id: receipt.id,
      date: receipt.timestamp,
      venue: receipt.venue || 'Unknown Venue',
      totalAmount: receipt.totalAmount,
      participantCount: receipt.participants.length,
      imageUri,
      status: receipt.isProcessed ? 'processed' : 'pending',
      receipt,
    };

    // Remove existing bill with same ID if it exists
    this.bills = this.bills.filter(bill => bill.id !== receipt.id);
    
    // Add new bill
    this.bills.push(billHistoryItem);
    
    await this.saveBills();
    return billHistoryItem;
  }

  async deleteBill(id: string): Promise<boolean> {
    await this.loadBills();
    const initialLength = this.bills.length;
    this.bills = this.bills.filter(bill => bill.id !== id);
    
    if (this.bills.length < initialLength) {
      await this.saveBills();
      return true;
    }
    return false;
  }

  async searchBills(query: string): Promise<BillHistoryItem[]> {
    await this.loadBills();
    
    if (!query.trim()) {
      return this.getAllBills();
    }

    const searchTerm = query.toLowerCase();
    return this.bills.filter(bill => {
      // Search by venue name
      if (bill.venue.toLowerCase().includes(searchTerm)) return true;
      
      // Search by participant names
      if (bill.receipt.participants.some(p => 
        p.name.toLowerCase().includes(searchTerm)
      )) return true;
      
      // Search by amount
      if (bill.totalAmount.toString().includes(searchTerm)) return true;
      
      // Search by date (format: YYYY-MM-DD)
      if (bill.date.toISOString().slice(0, 10).includes(searchTerm)) return true;
      
      return false;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async filterBills(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
    participantCount?: number;
    status?: 'processed' | 'pending' | 'error';
  }): Promise<BillHistoryItem[]> {
    await this.loadBills();
    
    return this.bills.filter(bill => {
      if (filters.dateFrom && bill.date < filters.dateFrom) return false;
      if (filters.dateTo && bill.date > filters.dateTo) return false;
      if (filters.minAmount && bill.totalAmount < filters.minAmount) return false;
      if (filters.maxAmount && bill.totalAmount > filters.maxAmount) return false;
      if (filters.participantCount && bill.participantCount !== filters.participantCount) return false;
      if (filters.status && bill.status !== filters.status) return false;
      return true;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getRecentParticipants(): Promise<string[]> {
    await this.loadBills();
    
    const participantNames = new Set<string>();
    
    // Get participants from recent bills (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.bills
      .filter(bill => bill.date >= thirtyDaysAgo)
      .forEach(bill => {
        bill.receipt.participants.forEach(participant => {
          participantNames.add(participant.name);
        });
      });
    
    return Array.from(participantNames).slice(0, 10); // Return top 10 recent participants
  }

  async getBillStats(): Promise<{
    totalBills: number;
    totalAmount: number;
    averageAmount: number;
    mostFrequentParticipant: string | null;
    thisMonthTotal: number;
  }> {
    await this.loadBills();
    
    const totalBills = this.bills.length;
    const totalAmount = this.bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const averageAmount = totalBills > 0 ? totalAmount / totalBills : 0;
    
    // Calculate this month's total
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTotal = this.bills
      .filter(bill => bill.date >= startOfMonth)
      .reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    // Find most frequent participant
    const participantCounts: { [name: string]: number } = {};
    this.bills.forEach(bill => {
      bill.receipt.participants.forEach(participant => {
        participantCounts[participant.name] = (participantCounts[participant.name] || 0) + 1;
      });
    });
    
    const mostFrequentParticipant = Object.keys(participantCounts).length > 0
      ? Object.keys(participantCounts).reduce((a, b) => 
          participantCounts[a] > participantCounts[b] ? a : b
        )
      : null;
    
    return {
      totalBills,
      totalAmount,
      averageAmount,
      mostFrequentParticipant,
      thisMonthTotal,
    };
  }

  async clearAllBills(): Promise<void> {
    this.bills = [];
    await AsyncStorage.removeItem(BILLS_STORAGE_KEY);
  }
}

export default BillStorageService.getInstance(); 