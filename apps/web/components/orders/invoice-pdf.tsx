import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1A1A18' },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#E4E4E7',
    paddingBottom: 15,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { fontSize: 24, fontWeight: 'bold' },
  docTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  docMeta: { fontSize: 9, color: '#71717A', textAlign: 'right', marginTop: 4 },
  parties: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  party: { width: '48%' },
  partyTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#71717A',
    marginBottom: 6,
  },
  partyLine: { fontSize: 9, marginBottom: 2 },
  partyName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#1A1A18',
    marginBottom: 6,
  },
  table: { display: 'flex', flexDirection: 'column', borderTop: 1, borderTopColor: '#E4E4E7' },
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
  // Itemised GST table columns
  cName: { flex: 2.2, paddingHorizontal: 4, fontSize: 8 },
  cHsn: { fontSize: 7, fontStyle: 'italic', color: '#71717A', marginTop: 1 },
  cQty: { flex: 0.55, paddingHorizontal: 4, fontSize: 8, textAlign: 'center' },
  cRate: { flex: 1, paddingHorizontal: 4, fontSize: 8, textAlign: 'right' },
  cTaxable: { flex: 1.2, paddingHorizontal: 4, fontSize: 8, textAlign: 'right' },
  cGstRate: { flex: 0.6, paddingHorizontal: 4, fontSize: 8, textAlign: 'center' },
  cTax: { flex: 1.05, paddingHorizontal: 4, fontSize: 8, textAlign: 'right' },
  cTotal: { flex: 1.25, paddingHorizontal: 4, fontSize: 8, textAlign: 'right' },
  cGrandRow: { backgroundColor: '#FAFAFA', borderTop: 1, borderTopColor: '#1A1A18' },
  cBold: { fontWeight: 'bold' },
  totals: { marginTop: 12, marginLeft: 'auto', width: '55%' },
  row: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  grandRow: {
    borderTop: 2,
    borderTopColor: '#1A1A18',
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 6,
  },
  grandText: { fontSize: 13, fontWeight: 'bold' },
  // Amount-payable rows: label takes the slack, amounts share a fixed-width
  // right-aligned column so every figure lines up on its last digit.
  tLabel: { flex: 1, fontSize: 10 },
  tAmount: { width: 130, fontSize: 10, textAlign: 'right' },
  // Summary (totals) presented as a bordered table
  sumTable: { display: 'flex', flexDirection: 'column', borderTop: 1, borderTopColor: '#E4E4E7' },
  sumRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: 1,
    borderBottomColor: '#E4E4E7',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  sumRowHeader: {
    borderBottomColor: '#1A1A18',
    borderBottomWidth: 1,
    backgroundColor: '#FAFAFA',
    fontWeight: 'bold',
  },
  sumCellLabel: { fontSize: 9 },
  sumCellAmount: { fontSize: 9, textAlign: 'right' },
  sumGrandRow: { backgroundColor: '#FAFAFA', borderBottomWidth: 0, paddingVertical: 8 },
  sumGrandText: { fontSize: 12, fontWeight: 'bold' },
  // Complete price-breakdown table columns
  pbDesc: { flex: 2.2, paddingHorizontal: 6, fontSize: 9 },
  pbTaxable: { flex: 1.3, paddingHorizontal: 6, fontSize: 9, textAlign: 'right' },
  pbRate: { flex: 0.7, paddingHorizontal: 6, fontSize: 9, textAlign: 'center' },
  pbGst: { flex: 1.2, paddingHorizontal: 6, fontSize: 9, textAlign: 'right' },
  pbTotal: { flex: 1.3, paddingHorizontal: 6, fontSize: 9, textAlign: 'right' },
  pbGrandRow: { backgroundColor: '#FAFAFA', fontWeight: 'bold' },
  note: {
    marginTop: 24,
    padding: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 4,
    fontSize: 8,
    color: '#92400E',
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: 1,
    borderTopColor: '#E4E4E7',
    fontSize: 8,
    color: '#71717A',
  },
  footerText: { marginBottom: 3 },
});

const inr = (n: number) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export interface InvoiceItem {
  name: string;
  hsnCode: string | null;
  gstRate?: number | null;
  quantity: number;
  unitPrice: number;
  taxableValue: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  isPaid: boolean;
  seller: { name: string; gstin: string; stateCode: string; address: string };
  buyer: {
    companyName: string;
    gstin: string | null;
    address: string;
    state: string;
    email: string | null;
    phone: string | null;
  };
  /** Delivery address, when it exists and can differ from the billing address. */
  shipTo: {
    name: string;
    address: string;
    phone: string | null;
  } | null;
  items: InvoiceItem[];
  /** Number of gift packs — packaging & add-ons are priced per pack. */
  packQuantity: number;
  amounts: {
    subtotal: number;
    packaging: number;
    addons: number;
    shipping: number;
    discount: number;
    cgst: number;
    sgst: number;
    igst: number;
    razorpayFee: number;
    grandTotal: number;
  };
  payment?: {
    amountPaid: number;
    paymentType: 'advance' | 'full' | null;
    paidAt: string | null;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Courier / goods-transport service. The quoted rate is GST-inclusive. */
const SHIPPING_HSN_CODE = '996812';
const SHIPPING_GST_RATE = 18;
/** Packaging & add-ons: cartons/boxes of paper. */
const PACKAGING_HSN_CODE = '4819';
const PACKAGING_GST_RATE = 18;
/** Payment gateway: other financial services (SAC). The fee already contains GST. */
const GATEWAY_HSN_CODE = '997158';
const GATEWAY_GST_RATE = 18;

/**
 * One line of the itemised GST table. `quantity`/`unitPrice` are null for
 * charges that aren't sold by the unit (shipping), where a "1 × Rs. 2,463.92"
 * reads as nonsense — those rows show their taxable value directly.
 */
interface TaxRow {
  name: string;
  hsn: string;
  quantity: number | null;
  unitPrice: number | null;   // exclusive of GST
  taxable: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { seller, buyer, shipTo, items, amounts, packQuantity } = data;
  const title = data.isPaid ? 'Tax Invoice' : 'Proforma Invoice';

  // Place of supply: same state → CGST + SGST, different state → IGST.
  const isIntraState = amounts.igst <= 0;

  /** Split a GST amount into CGST/SGST (intra-state) or IGST (inter-state). */
  const splitGst = (gst: number) => {
    if (!isIntraState) return { cgst: 0, sgst: 0, igst: gst };
    const cgst = round2(gst / 2);
    return { cgst, sgst: round2(gst - cgst), igst: 0 };
  };

  /**
   * A taxable row where `taxable` EXCLUDES GST — tax is added on top.
   * Pass quantity = null for charges that aren't sold by the unit.
   */
  const exclusiveRow = (
    name: string,
    hsn: string,
    quantity: number | null,
    taxable: number,
    gstRate: number
  ): TaxRow => {
    const gst = round2((taxable * gstRate) / 100);
    return {
      name,
      hsn,
      quantity,
      unitPrice: quantity && quantity > 0 ? round2(taxable / quantity) : null,
      taxable: round2(taxable),
      gstRate,
      ...splitGst(gst),
      total: round2(taxable + gst),
    };
  };

  const rows: TaxRow[] = [];

  // 1. Products — one row each, HSN printed under the name.
  for (const it of items) {
    rows.push(
      exclusiveRow(it.name, it.hsnCode || '—', it.quantity, it.taxableValue, it.gstRate ?? 18)
    );
  }

  // 2. Packaging & add-ons — priced per gift pack, so the quantity is the pack
  //    count and the unit price is the per-pack charge.
  if (amounts.packaging > 0) {
    rows.push(
      exclusiveRow('Packaging', PACKAGING_HSN_CODE, packQuantity, amounts.packaging, PACKAGING_GST_RATE)
    );
  }
  if (amounts.addons > 0) {
    rows.push(
      exclusiveRow('Add-ons', PACKAGING_HSN_CODE, packQuantity, amounts.addons, PACKAGING_GST_RATE)
    );
  }

  // 3. Shipping — a single freight charge, not a unit-priced product, so it
  //    carries no Qty / Unit Price. The courier rate is GST-INCLUSIVE, so
  //    reverse-calculate: taxable = amount / 1.18, gst = taxable * 0.18.
  if (amounts.shipping > 0) {
    const taxable = round2(amounts.shipping / (1 + SHIPPING_GST_RATE / 100));
    const gst = round2(amounts.shipping - taxable);
    rows.push({
      name: 'Shipping',
      hsn: SHIPPING_HSN_CODE,
      quantity: null,
      unitPrice: null,
      taxable,
      gstRate: SHIPPING_GST_RATE,
      ...splitGst(gst),
      total: round2(amounts.shipping),
    });
  }

  // 4. Payment gateway fee — passed through to the customer as its own taxable
  //    line (CLAUDE.md Rule 2). Like shipping it is not unit-priced, and the
  //    stored amount is GST-INCLUSIVE (fee base + GST on the fee), so the
  //    taxable value is reverse-calculated the same way.
  if (amounts.razorpayFee > 0) {
    const taxable = round2(amounts.razorpayFee / (1 + GATEWAY_GST_RATE / 100));
    const gst = round2(amounts.razorpayFee - taxable);
    rows.push({
      name: 'Payment Gateway Fee',
      hsn: GATEWAY_HSN_CODE,
      quantity: null,
      unitPrice: null,
      taxable,
      gstRate: GATEWAY_GST_RATE,
      ...splitGst(gst),
      total: round2(amounts.razorpayFee),
    });
  }

  // Grand total across every column except GST % (a rate can't be summed).
  const sum = (pick: (r: TaxRow) => number) => round2(rows.reduce((s, r) => s + pick(r), 0));
  const totals = {
    quantity: rows.reduce((s, r) => s + (r.quantity ?? 0), 0),
    unitPrice: sum((r) => r.unitPrice ?? 0),
    taxable: sum((r) => r.taxable),
    cgst: sum((r) => r.cgst),
    sgst: sum((r) => r.sgst),
    igst: sum((r) => r.igst),
    total: sum((r) => r.total),
  };
  const totalTax = round2(totals.cgst + totals.sgst + totals.igst);

  // Payment (10% advance / full). A partly-paid order keeps a pending balance.
  const amountPaid = data.payment?.amountPaid ?? 0;
  const balanceDue = round2(Math.max(0, amounts.grandTotal - amountPaid));
  const isAdvance = data.payment?.paymentType !== 'full';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>GiftCraft</Text>
            <Text style={[styles.partyLine, { marginTop: 6 }]}>{seller.name}</Text>
            <Text style={styles.partyLine}>{seller.address}</Text>
            <Text style={styles.partyLine}>GSTIN: {seller.gstin}</Text>
            <Text style={styles.partyLine}>State Code: {seller.stateCode}</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docMeta}>Invoice #: {data.invoiceNumber}</Text>
            <Text style={styles.docMeta}>
              Date: {new Date(data.invoiceDate).toLocaleDateString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Bill To (company / GST address) + Ship To (delivery address) */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyTitle}>Bill To</Text>
            <Text style={styles.partyName}>{buyer.companyName || '—'}</Text>
            {buyer.address ? <Text style={styles.partyLine}>{buyer.address}</Text> : null}
            {buyer.state ? <Text style={styles.partyLine}>State: {buyer.state}</Text> : null}
            <Text style={styles.partyLine}>GSTIN: {buyer.gstin || 'Unregistered (B2C)'}</Text>
            {buyer.email ? <Text style={styles.partyLine}>{buyer.email}</Text> : null}
            {buyer.phone ? <Text style={styles.partyLine}>{buyer.phone}</Text> : null}
          </View>

          {shipTo ? (
            <View style={styles.party}>
              <Text style={styles.partyTitle}>Ship To</Text>
              <Text style={styles.partyName}>{shipTo.name || buyer.companyName || '—'}</Text>
              <Text style={styles.partyLine}>{shipTo.address}</Text>
              {shipTo.phone ? <Text style={styles.partyLine}>{shipTo.phone}</Text> : null}
            </View>
          ) : null}
        </View>

        {/* Itemised GST table — one row per item, tax shown inline */}
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={styles.cName}>Item</Text>
              <Text style={styles.cQty}>Qty</Text>
              <Text style={styles.cRate}>Unit Price</Text>
              <Text style={styles.cTaxable}>Taxable Value</Text>
              <Text style={styles.cGstRate}>GST %</Text>
              {isIntraState ? (
                <>
                  <Text style={styles.cTax}>CGST</Text>
                  <Text style={styles.cTax}>SGST</Text>
                </>
              ) : (
                <Text style={styles.cTax}>IGST</Text>
              )}
              <Text style={styles.cTotal}>Total</Text>
            </View>

            {rows.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.cName}>
                  <Text>{r.name}</Text>
                  <Text style={styles.cHsn}>HSN {r.hsn}</Text>
                </View>
                <Text style={styles.cQty}>{r.quantity ?? '—'}</Text>
                <Text style={styles.cRate}>{r.unitPrice != null ? inr(r.unitPrice) : '—'}</Text>
                <Text style={styles.cTaxable}>{inr(r.taxable)}</Text>
                <Text style={styles.cGstRate}>{r.gstRate}%</Text>
                {isIntraState ? (
                  <>
                    <Text style={styles.cTax}>{inr(r.cgst)}</Text>
                    <Text style={styles.cTax}>{inr(r.sgst)}</Text>
                  </>
                ) : (
                  <Text style={styles.cTax}>{inr(r.igst)}</Text>
                )}
                <Text style={styles.cTotal}>{inr(r.total)}</Text>
              </View>
            ))}

            {/* Grand total — every column summed except GST % */}
            <View style={[styles.tableRow, styles.cGrandRow]}>
              <View style={styles.cName}>
                <Text style={styles.cBold}>Grand Total</Text>
              </View>
              <Text style={[styles.cQty, styles.cBold]}>{totals.quantity}</Text>
              <Text style={[styles.cRate, styles.cBold]}>{inr(totals.unitPrice)}</Text>
              <Text style={[styles.cTaxable, styles.cBold]}>{inr(totals.taxable)}</Text>
              <Text style={styles.cGstRate}>—</Text>
              {isIntraState ? (
                <>
                  <Text style={[styles.cTax, styles.cBold]}>{inr(totals.cgst)}</Text>
                  <Text style={[styles.cTax, styles.cBold]}>{inr(totals.sgst)}</Text>
                </>
              ) : (
                <Text style={[styles.cTax, styles.cBold]}>{inr(totals.igst)}</Text>
              )}
              <Text style={[styles.cTotal, styles.cBold]}>{inr(totals.total)}</Text>
            </View>
          </View>
        </View>

        {/* Amount payable. Taxable value and GST are not repeated here — the
            item table's Grand Total row already carries both. Only figures the
            table cannot show (discount, payments received) appear below it. */}
        <View style={styles.section}>
          <View style={styles.totals}>
            {amounts.discount > 0 && (
              <View style={styles.row}>
                <Text style={styles.tLabel}>Discount</Text>
                <Text style={styles.tAmount}>- {inr(amounts.discount)}</Text>
              </View>
            )}
            <View style={[styles.row, styles.grandRow]}>
              <Text style={[styles.tLabel, styles.grandText]}>Amount Payable</Text>
              <Text style={[styles.tAmount, styles.grandText]}>{inr(amounts.grandTotal)}</Text>
            </View>

            {/* Advance paid + pending balance (price-lock path) */}
            {amountPaid > 0 && (
              <>
                <View style={styles.row}>
                  <Text style={styles.tLabel}>
                    {isAdvance ? 'Advance Paid (10%)' : 'Amount Paid'}
                  </Text>
                  <Text style={styles.tAmount}>- {inr(amountPaid)}</Text>
                </View>
                <View style={[styles.row, styles.grandRow]}>
                  <Text style={[styles.tLabel, styles.grandText]}>Balance Pending</Text>
                  <Text style={[styles.tAmount, styles.grandText]}>{inr(balanceDue)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* {!data.isPaid && (
          <Text style={styles.note}>
            {amountPaid > 0
              ? `This is a Proforma Invoice. A 10% advance of ${inr(amountPaid)} has been received; the balance of ${inr(balanceDue)} is due after mockup approval. A GST Tax Invoice will be issued once the order is fully paid.`
              : 'This is a Proforma Invoice for your reference and is not a valid tax invoice. A GST Tax Invoice will be issued upon receipt of payment.'}
          </Text>
        )} */}
      </Page>
    </Document>
  );
}
