import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BillHistoryItem, Receipt } from '../../types/Bill';
import BillStorageService from '../../services/BillStorageService';

interface BillHistoryScreenProps {
  onClose: () => void;
}

interface BillDetailModalProps {
  bill: BillHistoryItem | null;
  visible: boolean;
  onClose: () => void;
}

const BillDetailModal: React.FC<BillDetailModalProps> = ({ bill, visible, onClose }) => {
  if (!bill) return null;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Bill Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Bill Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: bill.imageUri }} style={styles.billImage} />
          </View>

          {/* Bill Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.venueName}>{bill.venue}</Text>
            <Text style={styles.billDate}>{formatDate(bill.date)}</Text>
            <Text style={styles.totalAmount}>{formatCurrency(bill.totalAmount)}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, 
                bill.status === 'processed' ? styles.processedBadge : 
                bill.status === 'pending' ? styles.pendingBadge : styles.errorBadge
              ]}>
                <Text style={styles.statusText}>
                  {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Participants */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants ({bill.participantCount})</Text>
            {bill.receipt.participants.map((participant, index) => (
              <View key={participant.id} style={styles.participantRow}>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  {participant.isPayer && (
                    <View style={styles.payerBadge}>
                      <Text style={styles.payerText}>Payer</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.participantAmount}>
                  {formatCurrency(participant.totalOwed)}
                </Text>
              </View>
            ))}
          </View>

          {/* Items */}
          {bill.receipt.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items ({bill.receipt.items.length})</Text>
              {bill.receipt.items.map((item, index) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.quantity > 1 && (
                      <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bill Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(bill.totalAmount - bill.receipt.taxAmount - bill.receipt.tipAmount)}
              </Text>
            </View>
            {bill.receipt.taxAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tax</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(bill.receipt.taxAmount)}
                </Text>
              </View>
            )}
            {bill.receipt.tipAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Tip {bill.receipt.tipPercentage ? `(${bill.receipt.tipPercentage}%)` : ''}
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(bill.receipt.tipAmount)}
                </Text>
              </View>
            )}
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(bill.totalAmount)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function BillHistoryScreen({ onClose }: BillHistoryScreenProps) {
  const [bills, setBills] = useState<BillHistoryItem[]>([]);
  const [filteredBills, setFilteredBills] = useState<BillHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    totalBills: 0,
    totalAmount: 0,
    averageAmount: 0,
    thisMonthTotal: 0,
  });

  const loadBills = useCallback(async () => {
    try {
      const [allBills, billStats] = await Promise.all([
        BillStorageService.getAllBills(),
        BillStorageService.getBillStats(),
      ]);
      setBills(allBills);
      setFilteredBills(allBills);
      setStats(billStats);
    } catch (error) {
      console.error('Error loading bills:', error);
      Alert.alert('Error', 'Failed to load bill history');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (searchQuery.trim()) {
      BillStorageService.searchBills(searchQuery).then(setFilteredBills);
    } else {
      setFilteredBills(bills);
    }
  }, [searchQuery, bills]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBills();
  };

  const handleBillPress = (bill: BillHistoryItem) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };

  const handleDeleteBill = async (billId: string) => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BillStorageService.deleteBill(billId);
              loadBills();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bill');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  const renderBillItem = ({ item }: { item: BillHistoryItem }) => (
    <TouchableOpacity style={styles.billCard} onPress={() => handleBillPress(item)}>
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      <View style={styles.billInfo}>
        <View style={styles.billHeader}>
          <Text style={styles.venue} numberOfLines={1}>{item.venue}</Text>
          <View style={[styles.statusDot, 
            item.status === 'processed' ? styles.processedDot : 
            item.status === 'pending' ? styles.pendingDot : styles.errorDot
          ]} />
        </View>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <View style={styles.billFooter}>
          <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
          <Text style={styles.participants}>
            {item.participantCount} {item.participantCount === 1 ? 'person' : 'people'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteBill(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Bills Yet</Text>
      <Text style={styles.emptyMessage}>
        Start by capturing your first bill using the camera!
      </Text>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalBills}</Text>
        <Text style={styles.statLabel}>Total Bills</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{formatCurrency(stats.thisMonthTotal)}</Text>
        <Text style={styles.statLabel}>This Month</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{formatCurrency(stats.averageAmount)}</Text>
        <Text style={styles.statLabel}>Average</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Bill History</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bills by venue, participant, or amount..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {bills.length > 0 && renderStats()}

      {/* Bills List */}
      <FlatList
        data={filteredBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        style={styles.billsList}
        contentContainerStyle={filteredBills.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Bill Detail Modal */}
      <BillDetailModal
        bill={selectedBill}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  billsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  billCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  billInfo: {
    flex: 1,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  venue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  processedDot: {
    backgroundColor: '#10b981',
  },
  pendingDot: {
    backgroundColor: '#f59e0b',
  },
  errorDot: {
    backgroundColor: '#ef4444',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  participants: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  billImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  venueName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  billDate: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 12,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  processedBadge: {
    backgroundColor: '#d1fae5',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  errorBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    color: '#111827',
    marginRight: 8,
  },
  payerBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  payerText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  participantAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
}); 