import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatRupees } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#222222',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#E4E4E7',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1A3C6E',
  },
  headerMeta: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#71717A',
    marginBottom: 10,
  },
  twoColumn: {
    display: 'flex',
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 10,
    color: '#222222',
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#222222',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 15,
    borderTop: 1,
    borderTopColor: '#E4E4E7',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#E4E4E7',
    paddingVertical: 8,
  },
  tableRowHeader: {
    borderBottomColor: '#222222',
    borderBottomWidth: 2,
    fontWeight: 'bold',
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    flex: 1.5,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  tableCellSku: {
    flex: 0.8,
    paddingHorizontal: 8,
    fontSize: 8,
    color: '#71717A',
  },
  tableCellQty: {
    flex: 0.6,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 9,
  },
  tableCellPrice: {
    flex: 0.8,
    paddingHorizontal: 8,
    textAlign: 'right',
    fontSize: 9,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalRow: {
    borderTop: 2,
    borderTopColor: '#222222',
    paddingVertical: 8,
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 10,
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222222',
  },
  notesSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#E4E4E7',
    fontSize: 9,
    color: '#71717A',
  },
  footer: {
    marginTop: 40,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#E4E4E7',
    fontSize: 8,
    color: '#71717A',
  },
});

interface Item {
  id: string;
  product: {
    name: string;
    slug: string;
  };
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  grandTotal: number;
  items: Item[];
  // Both are nullable in the schema: self-serve orders are placed by a user who
  // has no Company row, and deliveryDate is only set once ops schedules it.
  deliveryDate?: string | Date | null;
  company?: { name: string } | null;
}

interface VendorPoPDFProps {
  order: Order;
  vendor?: {
    name: string;
    address: string;
    city: string;
    state: string;
    gst: string;
  };
  /** Falls back to when `order.company` is null (self-serve orders). */
  clientName?: string;
}

export function VendorPoPDF({ order, vendor, clientName }: VendorPoPDFProps) {
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const gst = subtotal * 0.18; // Assume 18% GST
  const total = subtotal + gst;
  const client = order.company?.name || clientName || '—';
  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate).toLocaleDateString('en-IN')
    : 'To be scheduled';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>GIVOO</Text>
          <View style={styles.headerMeta}>
            <Text>PURCHASE ORDER</Text>
            <Text>PO # {order.orderNumber}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text></Text>
            <Text>Date: {new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Vendor Purchase Order</Text>

        {/* Vendor & Client Details */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.label}>Bill To (Vendor)</Text>
            <Text style={styles.value}>{vendor?.name || 'Vendor Details'}</Text>
            {vendor?.address && <Text style={styles.value}>{vendor.address}</Text>}
            {vendor?.city && (
              <Text style={styles.value}>
                {vendor.city}, {vendor.state}
              </Text>
            )}
            {vendor?.gst && <Text style={styles.value}>GST: {vendor.gst}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Client (Ship To)</Text>
            <Text style={styles.value}>{client}</Text>
            <Text style={styles.value}>GIVOO Delhi</Text>
            <Text style={styles.value}>Delhi, DL</Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.label}>Delivery Date</Text>
            <Text style={styles.value}>{deliveryDate}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Order Reference</Text>
            <Text style={styles.value}>{order.orderNumber}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={styles.tableCell}>Product Name</Text>
              <Text style={styles.tableCellQty}>Qty</Text>
              <Text style={styles.tableCellPrice}>Unit Price</Text>
              <Text style={styles.tableCellPrice}>Total</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.product.name}</Text>
                <Text style={styles.tableCellQty}>{item.quantity}</Text>
                <Text style={styles.tableCellPrice}>{formatRupees(item.unitPrice)}</Text>
                <Text style={styles.tableCellPrice}>
                  {formatRupees(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={[styles.row, styles.totalRow]}>
          <Text>Subtotal:</Text>
          <Text>{formatRupees(subtotal)}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text>GST (18%):</Text>
          <Text>{formatRupees(gst)}</Text>
        </View>
        <View style={[styles.row, styles.totalRow, { borderTop: 2 }]}>
          <Text style={styles.grandTotal}>Total Amount:</Text>
          <Text style={styles.grandTotal}>{formatRupees(total)}</Text>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.label}>Payment Terms</Text>
          <Text>50% advance on order confirmation, 50% before dispatch</Text>
          <Text style={[styles.label, { marginTop: 10 }]}>Delivery Instructions</Text>
          <Text>
            Please ensure all items are delivered by the specified date. Quality checks will be
            conducted upon receipt.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This is an automated purchase order generated by GIVOO. For clarifications, contact
            orders@giftcraft.in
          </Text>
        </View>
      </Page>
    </Document>
  );
}
