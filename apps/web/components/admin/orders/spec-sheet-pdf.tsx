import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1A1A18',
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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A1A18',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: 1,
    borderBottomColor: '#E4E4E7',
    paddingBottom: 8,
  },
  specGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  specRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottom: 1,
    borderBottomColor: '#F4F4F5',
  },
  specLabel: {
    flex: 0.4,
    fontWeight: 'bold',
    color: '#71717A',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specValue: {
    flex: 0.6,
    color: '#1A1A18',
    fontSize: 10,
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
    borderBottomColor: '#1A1A18',
    borderBottomWidth: 2,
    fontWeight: 'bold',
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  tableHeaderCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 9,
    color: '#71717A',
    lineHeight: 1.4,
    marginTop: 8,
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
}

interface Order {
  id: string;
  orderNumber: string;
  items: Item[];
  // Both are nullable in the schema: self-serve orders are placed by a user who
  // has no Company row, and deliveryDate is only set once ops schedules it.
  deliveryDate?: string | Date | null;
  company?: { name: string } | null;
}

interface SpecSheetPDFProps {
  order: Order;
  /** Falls back to when `order.company` is null (self-serve orders). */
  clientName?: string;
}

export function SpecSheetPDF({ order, clientName }: SpecSheetPDFProps) {
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const client = order.company?.name || clientName || '—';
  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate).toLocaleDateString('en-IN')
    : 'To be scheduled';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>GiftCraft</Text>
          <View style={styles.headerMeta}>
            <Text>PRODUCTION SPECIFICATION SHEET</Text>
            <Text>Order: {order.orderNumber}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>Client: {client}</Text>
            <Text>Date: {new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Production Specification Sheet</Text>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Order Number</Text>
              <Text style={styles.specValue}>{order.orderNumber}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Client</Text>
              <Text style={styles.specValue}>{client}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Total Quantity</Text>
              <Text style={styles.specValue}>{totalQuantity} units</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Delivery By</Text>
              <Text style={styles.specValue}>
                {deliveryDate}
              </Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Number of SKUs</Text>
              <Text style={styles.specValue}>{order.items.length}</Text>
            </View>
          </View>
        </View>

        {/* Product Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Specifications</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={styles.tableHeaderCell}>Product Name</Text>
              <Text style={styles.tableHeaderCell}>Quantity</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.product.name}</Text>
                <Text style={styles.tableCell}>{item.quantity} units</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Printing Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printing Specifications</Text>
          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Technique</Text>
              <Text style={styles.specValue}>Screen Print / Digital Print / Embroidery (as per product)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Color Mode</Text>
              <Text style={styles.specValue}>CMYK for print, RGB for digital artwork</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Print Position</Text>
              <Text style={styles.specValue}>Front / Back / Left Sleeve (as per design approval)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Design File</Text>
              <Text style={styles.specValue}>Approved mockup • Vector format preferred for print</Text>
            </View>
          </View>
          <Text style={styles.notes}>
            • All designs must be approved before production • Minimum 300 DPI for print quality • Color variations within ±5% due to printing processes are acceptable
          </Text>
        </View>

        {/* Packaging Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Packaging Specifications</Text>
          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Packaging Type</Text>
              <Text style={styles.specValue}>Custom branded box / Standard carton (as specified)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Individual Units</Text>
              <Text style={styles.specValue}>Individually wrapped in tissue / kraft paper</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Bulk Packaging</Text>
              <Text style={styles.specValue}>Cartons grouped by 10-20 units for easier handling</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Labeling</Text>
              <Text style={styles.specValue}>GiftCraft invoice label on outer carton</Text>
            </View>
          </View>
        </View>

        {/* Quality Standards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quality Standards</Text>
          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>QC Checklist</Text>
              <Text style={styles.specValue}>Print quality • Color match • Stitching/seams • Packaging integrity</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Defect Rate</Text>
              <Text style={styles.specValue}>Maximum 2% (20 units per 1000)</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Inspection</Text>
              <Text style={styles.specValue}>100% visual inspection before dispatch</Text>
            </View>
          </View>
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions</Text>
          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Shipping Method</Text>
              <Text style={styles.specValue}>Pickup from GiftCraft / Scheduled delivery</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Destination</Text>
              <Text style={styles.specValue}>GiftCraft Warehouse, Delhi</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Required By</Text>
              <Text style={styles.specValue}>
                {deliveryDate}
              </Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Delivery Contact</Text>
              <Text style={styles.specValue}>orders@giftcraft.in / +91-XXXXXXXXXX</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Notes</Text>
          <Text style={styles.notes}>
            • All materials must be lead-free and non-toxic • Production should begin immediately upon receipt • Any deviations from spec sheet must be communicated within 24 hours • Payment terms: 50% advance, 50% on delivery
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This specification sheet is valid only with authorized signatures. For changes or clarifications, contact the order coordinator within 48 hours of receipt.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
