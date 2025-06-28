import { Receipt, BillHistoryItem } from '../types/Bill';
import BillStorageService from '../services/BillStorageService';

export const createSampleBills = async (): Promise<void> => {
  const sampleReceipts: Receipt[] = [
    {
      id: 'bill-1',
      timestamp: new Date(2024, 11, 15, 19, 30), // Dec 15, 2024, 7:30 PM
      imageUrl: 'https://via.placeholder.com/300x400/2563eb/ffffff?text=Restaurant+Bill',
      originalImagePath: 'sample-1.jpg',
      totalAmount: 89.47,
      taxAmount: 7.16,
      tipAmount: 13.42,
      detectedTip: 13.42,
      manualTip: 0,
      tipPercentage: 18,
      venue: "Mario's Italian Restaurant",
      splitMethod: 'individual',
      isProcessed: true,
      ocrConfidence: 0.95,
      items: [
        {
          id: 'item-1-1',
          name: 'Margherita Pizza',
          price: 18.99,
          quantity: 1,
          assignedTo: ['participant-1-1'],
          isSharedEqually: false,
          ocrConfidence: 0.98,
        },
        {
          id: 'item-1-2',
          name: 'Caesar Salad',
          price: 12.99,
          quantity: 1,
          assignedTo: ['participant-1-2'],
          isSharedEqually: false,
          ocrConfidence: 0.92,
        },
        {
          id: 'item-1-3',
          name: 'Garlic Bread',
          price: 8.99,
          quantity: 1,
          assignedTo: ['participant-1-1', 'participant-1-2'],
          isSharedEqually: true,
          ocrConfidence: 0.89,
        },
        {
          id: 'item-1-4',
          name: 'Chicken Parmigiana',
          price: 24.99,
          quantity: 1,
          assignedTo: ['participant-1-3'],
          isSharedEqually: false,
          ocrConfidence: 0.94,
        },
      ],
      participants: [
        {
          id: 'participant-1-1',
          name: 'Alex',
          totalOwed: 0, // Bill payer
          assignedItems: ['item-1-1', 'item-1-3'],
          taxOwed: 0,
          tipOwed: 0,
          isPayer: true,
        },
        {
          id: 'participant-1-2',
          name: 'Sarah',
          totalOwed: 32.15,
          assignedItems: ['item-1-2', 'item-1-3'],
          taxOwed: 2.57,
          tipOwed: 3.84,
          isPayer: false,
        },
        {
          id: 'participant-1-3',
          name: 'Mike',
          totalOwed: 34.78,
          assignedItems: ['item-1-4'],
          taxOwed: 2.79,
          tipOwed: 4.17,
          isPayer: false,
        },
      ],
    },
    {
      id: 'bill-2',
      timestamp: new Date(2024, 11, 12, 14, 15), // Dec 12, 2024, 2:15 PM
      imageUrl: 'https://via.placeholder.com/300x400/10b981/ffffff?text=Coffee+Shop+Bill',
      originalImagePath: 'sample-2.jpg',
      totalAmount: 23.76,
      taxAmount: 1.90,
      tipAmount: 2.38,
      detectedTip: 2.38,
      manualTip: 0,
      tipPercentage: 15,
      venue: "Blue Mountain Coffee",
      splitMethod: 'equal',
      isProcessed: true,
      ocrConfidence: 0.87,
      items: [
        {
          id: 'item-2-1',
          name: 'Cappuccino',
          price: 4.50,
          quantity: 2,
          assignedTo: ['participant-2-1', 'participant-2-2'],
          isSharedEqually: true,
          ocrConfidence: 0.91,
        },
        {
          id: 'item-2-2',
          name: 'Blueberry Muffin',
          price: 3.99,
          quantity: 2,
          assignedTo: ['participant-2-1', 'participant-2-2'],
          isSharedEqually: true,
          ocrConfidence: 0.85,
        },
        {
          id: 'item-2-3',
          name: 'Avocado Toast',
          price: 7.99,
          quantity: 1,
          assignedTo: ['participant-2-1', 'participant-2-2'],
          isSharedEqually: true,
          ocrConfidence: 0.88,
        },
      ],
      participants: [
        {
          id: 'participant-2-1',
          name: 'Emma',
          totalOwed: 0, // Bill payer
          assignedItems: ['item-2-1', 'item-2-2', 'item-2-3'],
          taxOwed: 0,
          tipOwed: 0,
          isPayer: true,
        },
        {
          id: 'participant-2-2',
          name: 'James',
          totalOwed: 11.88,
          assignedItems: ['item-2-1', 'item-2-2', 'item-2-3'],
          taxOwed: 0.95,
          tipOwed: 1.19,
          isPayer: false,
        },
      ],
    },
    {
      id: 'bill-3',
      timestamp: new Date(2024, 11, 8, 20, 45), // Dec 8, 2024, 8:45 PM
      imageUrl: 'https://via.placeholder.com/300x400/f59e0b/ffffff?text=Grocery+Bill',
      originalImagePath: 'sample-3.jpg',
      totalAmount: 67.32,
      taxAmount: 4.21,
      tipAmount: 0,
      detectedTip: 0,
      manualTip: 0,
      venue: "Fresh Market Grocery",
      splitMethod: 'individual',
      isProcessed: true,
      ocrConfidence: 0.93,
      items: [
        {
          id: 'item-3-1',
          name: 'Organic Milk',
          price: 5.99,
          quantity: 1,
          assignedTo: ['participant-3-1', 'participant-3-2', 'participant-3-3'],
          isSharedEqually: true,
          ocrConfidence: 0.96,
        },
        {
          id: 'item-3-2',
          name: 'Bread',
          price: 3.49,
          quantity: 2,
          assignedTo: ['participant-3-1', 'participant-3-2', 'participant-3-3'],
          isSharedEqually: true,
          ocrConfidence: 0.94,
        },
        {
          id: 'item-3-3',
          name: 'Chicken Breast',
          price: 12.99,
          quantity: 1,
          assignedTo: ['participant-3-1'],
          isSharedEqually: false,
          ocrConfidence: 0.91,
        },
        {
          id: 'item-3-4',
          name: 'Pasta',
          price: 4.99,
          quantity: 3,
          assignedTo: ['participant-3-2'],
          isSharedEqually: false,
          ocrConfidence: 0.89,
        },
        {
          id: 'item-3-5',
          name: 'Vegetables',
          price: 8.99,
          quantity: 1,
          assignedTo: ['participant-3-3'],
          isSharedEqually: false,
          ocrConfidence: 0.87,
        },
      ],
      participants: [
        {
          id: 'participant-3-1',
          name: 'David',
          totalOwed: 0, // Bill payer
          assignedItems: ['item-3-1', 'item-3-2', 'item-3-3'],
          taxOwed: 0,
          tipOwed: 0,
          isPayer: true,
        },
        {
          id: 'participant-3-2',
          name: 'Lisa',
          totalOwed: 21.47,
          assignedItems: ['item-3-1', 'item-3-2', 'item-3-4'],
          taxOwed: 1.34,
          tipOwed: 0,
          isPayer: false,
        },
        {
          id: 'participant-3-3',
          name: 'Tom',
          totalOwed: 15.28,
          assignedItems: ['item-3-1', 'item-3-2', 'item-3-5'],
          taxOwed: 0.96,
          tipOwed: 0,
          isPayer: false,
        },
      ],
    },
  ];

  // Save sample bills to storage
  for (const receipt of sampleReceipts) {
    await BillStorageService.saveBill(receipt, receipt.imageUrl);
  }

  console.log('Sample bills created successfully!');
};

export const clearSampleData = async (): Promise<void> => {
  await BillStorageService.clearAllBills();
  console.log('All sample data cleared!');
}; 