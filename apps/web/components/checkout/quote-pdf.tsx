import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatRupees } from '@/lib/utils';
import { combinedGst, splitPaymentFee } from '@/lib/pricing-display';

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
    marginBottom: 10,
  },
  headerMeta: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#71717A',
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
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  tableCellQty: {
    flex: 0.6,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  tableCellPrice: {
    flex: 1,
    paddingHorizontal: 8,
    textAlign: 'right',
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
  footerSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#E4E4E7',
    fontSize: 8,
    color: '#71717A',
  },
  footerText: {
    marginBottom: 4,
  },
});

interface QuotePDFProps {
  quoteId: string;
  expiresAt: Date;
  payload: {
    products: any[];
    packaging?: any;
    addons: any[];
    shippingZone?: any;
    pricing: any;
    packQuantity?: number;
  };
  shareToken: string;
}

export function QuotePDF({ quoteId, expiresAt, payload, shareToken }: QuotePDFProps) {
  const { products, packaging, addons, shippingZone, pricing } = payload;
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${shareToken}`;
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-IN');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>GIVOO</Text>
          <View style={styles.headerMeta}>
            <View>
              <Text>Quote #{quoteId.slice(0, 8).toUpperCase()}</Text>
              <Text>Date: {new Date().toLocaleDateString('en-IN')}</Text>
            </View>
            <View>
              <Text>Valid until: {expiryDate}</Text>
            </View>
          </View>
        </View>

        {/* Products Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={styles.tableCell}>Product</Text>
              <Text style={styles.tableCellQty}>Qty</Text>
              <Text style={styles.tableCellPrice}>Price</Text>
              <Text style={styles.tableCellPrice}>Total</Text>
            </View>
            {products.map((product: any) => (
              <View key={product.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{product.name}</Text>
                <Text style={styles.tableCellQty}>{product.quantity}</Text>
                <Text style={styles.tableCellPrice}>₹{(product.sellPrice).toFixed(2)}</Text>
                <Text style={styles.tableCellPrice}>₹{(product.sellPrice * product.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Customizations */}
        {(packaging || addons.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customizations</Text>
            {packaging && (
              <View style={styles.row}>
                <Text>{packaging.name}</Text>
                <Text>₹{(packaging.price * (payload.packQuantity || 1)).toFixed(2)}</Text>
              </View>
            )}
            {addons.length > 0 && (
              <View>
                {addons.map((addon: any) => (
                  <View key={addon.id} style={styles.row}>
                    <Text>{addon.name}</Text>
                    <Text>₹{(addon.price * (payload.packQuantity || 1)).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Shipping (Shiprocket rate is already GST-inclusive) */}
        {shippingZone && (
          <View style={styles.section}>
            <View style={styles.row}>
              <Text>{shippingZone.zoneName} Shipping (incl. GST)</Text>
              <Text>₹{Number(pricing?.shipping || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing Summary</Text>
          <View style={styles.row}>
            <Text>Subtotal (before shipping, GST)</Text>
            <Text>₹{(pricing.itemsSubtotal ?? pricing.subtotal).toFixed(2)}</Text>
          </View>

          {/* Shipping at its TAXABLE value — the courier rate is GST-inclusive and
              the GST inside it is disclosed in the combined GST line below. */}
          {Number(pricing?.shipping || 0) > 0 && (
            <View style={styles.row}>
              <Text>Shipping (HSN 996812)</Text>
              <Text>₹{Number(pricing.shippingTaxable ?? pricing.shipping).toFixed(2)}</Text>
            </View>
          )}

          {/* Payment fee (2%), pre-GST — its GST is folded into the combined GST
              line below. */}
          {splitPaymentFee(pricing.razorpayFee || 0).base > 0 && (
            <View>
              <View style={styles.row}>
                <Text>Payment Processing Fee</Text>
                <Text>₹{splitPaymentFee(pricing.razorpayFee || 0).base.toFixed(2)}</Text>
              </View>
              <Text style={{ fontSize: 8, color: '#71717A', paddingHorizontal: 8 }}>
                (Razorpay 2%)
              </Text>
            </View>
          )}

          {/* GST — single all-in line: goods + shipping GST + the payment-fee GST,
              shown last, below the payment fee. */}
          {combinedGst(pricing.cgst || 0, pricing.sgst || 0, pricing.igst || 0, pricing.razorpayFee || 0) > 0 && (
            <View style={styles.row}>
              <Text>GST</Text>
              <Text>₹{combinedGst(pricing.cgst || 0, pricing.sgst || 0, pricing.igst || 0, pricing.razorpayFee || 0).toFixed(2)}</Text>
            </View>
          )}

          {/* Grand Total */}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.grandTotal}>Total</Text>
            <Text style={styles.grandTotal}>₹{pricing.grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Share this quote: {shareUrl}</Text>
          <Text style={styles.footerText}>Questions? Contact us at support@givoo.in</Text>
          <Text style={styles.footerText}>© GIVOO 2026. Powered by Arts Shala.</Text>
        </View>
      </Page>
    </Document>
  );
}
