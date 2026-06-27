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
  cName: { flex: 2.4, paddingHorizontal: 6, fontSize: 9 },
  cHsn: { flex: 1, paddingHorizontal: 6, fontSize: 9 },
  cQty: { flex: 0.7, paddingHorizontal: 6, fontSize: 9, textAlign: 'center' },
  cRate: { flex: 1, paddingHorizontal: 6, fontSize: 9, textAlign: 'right' },
  cAmt: { flex: 1.1, paddingHorizontal: 6, fontSize: 9, textAlign: 'right' },
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
  items: InvoiceItem[];
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

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { seller, buyer, items, amounts } = data;
  const title = data.isPaid ? 'Tax Invoice' : 'Proforma Invoice';
  const totalTax = amounts.cgst + amounts.sgst + amounts.igst;

  // ── Build ONE complete price breakdown table ──────────────────────────────
  // Each taxable row shows Taxable Value / GST % / GST Amount / Line Total, so
  // the tax is visible inline (no separate tax table) and the rows sum to the
  // grand total. Shipping is GST-inclusive (Shiprocket) → no separate GST.
  const round2 = (n: number) => Math.round(n * 100) / 100;

  interface BreakdownRow {
    desc: string;
    taxable?: number;
    rate?: number;
    gst?: number;
    total: number;
  }
  const rows: BreakdownRow[] = [];

  // Products grouped by HSN + rate.
  const productGroups = new Map<string, { hsn: string; rate: number; taxable: number }>();
  for (const it of items) {
    const rate = it.gstRate ?? 18;
    const hsn = it.hsnCode || '—';
    const key = `${hsn}|${rate}`;
    const prev = productGroups.get(key) || { hsn, rate, taxable: 0 };
    prev.taxable = round2(prev.taxable + it.taxableValue);
    productGroups.set(key, prev);
  }
  for (const g of productGroups.values()) {
    const gst = round2((g.taxable * g.rate) / 100);
    rows.push({ desc: `Products — HSN ${g.hsn}`, taxable: g.taxable, rate: g.rate, gst, total: round2(g.taxable + gst) });
  }
  if (amounts.packaging > 0) {
    const gst = round2(amounts.packaging * 0.18);
    rows.push({ desc: 'Packaging', taxable: amounts.packaging, rate: 18, gst, total: round2(amounts.packaging + gst) });
  }
  if (amounts.addons > 0) {
    const gst = round2(amounts.addons * 0.18);
    rows.push({ desc: 'Add-ons', taxable: amounts.addons, rate: 18, gst, total: round2(amounts.addons + gst) });
  }
  if (amounts.discount > 0) {
    rows.push({ desc: 'Discount', total: -amounts.discount });
  }
  if (amounts.shipping > 0) {
    rows.push({ desc: 'Shipping (incl. GST)', total: amounts.shipping });
  }
  if (amounts.razorpayFee > 0) {
    rows.push({ desc: 'Payment Gateway Fee', total: amounts.razorpayFee });
  }

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

        {/* Bill To */}
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
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={styles.cName}>Item</Text>
              <Text style={styles.cHsn}>HSN</Text>
              <Text style={styles.cQty}>Qty</Text>
              <Text style={styles.cRate}>Rate</Text>
              <Text style={styles.cAmt}>Taxable Value</Text>
            </View>
            {items.map((it, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cName}>{it.name}</Text>
                <Text style={styles.cHsn}>{it.hsnCode || '—'}</Text>
                <Text style={styles.cQty}>{it.quantity}</Text>
                <Text style={styles.cRate}>{inr(it.unitPrice)}</Text>
                <Text style={styles.cAmt}>{inr(it.taxableValue)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Complete Price Breakdown — one table, taxes shown inline per row */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={styles.pbDesc}>Particulars</Text>
              <Text style={styles.pbTaxable}>Taxable Value</Text>
              <Text style={styles.pbRate}>GST %</Text>
              <Text style={styles.pbGst}>GST Amount</Text>
              <Text style={styles.pbTotal}>Total</Text>
            </View>

            {rows.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.pbDesc}>{r.desc}</Text>
                <Text style={styles.pbTaxable}>{r.taxable != null ? inr(r.taxable) : '—'}</Text>
                <Text style={styles.pbRate}>{r.rate != null ? `${r.rate}%` : '—'}</Text>
                <Text style={styles.pbGst}>{r.gst != null ? inr(r.gst) : '—'}</Text>
                <Text style={styles.pbTotal}>{inr(r.total)}</Text>
              </View>
            ))}

            {/* Total GST summary row */}
            {totalTax > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.pbDesc}>Total GST</Text>
                <Text style={styles.pbTaxable} />
                <Text style={styles.pbRate} />
                <Text style={styles.pbGst}>{inr(totalTax)}</Text>
                <Text style={styles.pbTotal} />
              </View>
            )}

            {/* Grand total */}
            <View style={[styles.tableRow, styles.pbGrandRow]}>
              <Text style={styles.pbDesc}>Grand Total</Text>
              <Text style={styles.pbTaxable} />
              <Text style={styles.pbRate} />
              <Text style={styles.pbGst} />
              <Text style={styles.pbTotal}>{inr(amounts.grandTotal)}</Text>
            </View>

            {/* Advance paid + pending balance (price-lock path) */}
            {amountPaid > 0 && (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.pbDesc}>{isAdvance ? 'Advance Paid (10%)' : 'Amount Paid'}</Text>
                  <Text style={styles.pbTaxable} />
                  <Text style={styles.pbRate} />
                  <Text style={styles.pbGst} />
                  <Text style={styles.pbTotal}>- {inr(amountPaid)}</Text>
                </View>
                <View style={[styles.tableRow, styles.pbGrandRow]}>
                  <Text style={styles.pbDesc}>Balance Pending</Text>
                  <Text style={styles.pbTaxable} />
                  <Text style={styles.pbRate} />
                  <Text style={styles.pbGst} />
                  <Text style={styles.pbTotal}>{inr(balanceDue)}</Text>
                </View>
              </>
            )}
          </View>
          <Text style={{ fontSize: 8, color: '#71717A', marginTop: 4 }}>
            Shipping is charged inclusive of GST, so it carries no separate GST line.
          </Text>
        </View>

        {!data.isPaid && (
          <Text style={styles.note}>
            {amountPaid > 0
              ? `This is a Proforma Invoice. A 10% advance of ${inr(amountPaid)} has been received; the balance of ${inr(balanceDue)} is due after mockup approval. A GST Tax Invoice will be issued once the order is fully paid.`
              : 'This is a Proforma Invoice for your reference and is not a valid tax invoice. A GST Tax Invoice will be issued upon receipt of payment.'}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            GST Invoice as per Stage 1 scope. IRN &amp; QR code (e-invoicing) are not included at this stage.
          </Text>
          <Text style={styles.footerText}>Questions? Contact us at hello@giftcraft.in</Text>
          <Text style={styles.footerText}>© GiftCraft 2026. Powered by Arts Shala.</Text>
        </View>
      </Page>
    </Document>
  );
}
