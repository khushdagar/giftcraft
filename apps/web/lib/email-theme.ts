// Shared palette and escaping helpers for every outbound email.
// Kept dependency-free so the HTML builders can be unit-tested in isolation.
// Brand palette, taken from the GIVOO logo.

export const COLORS = {
  brand: '#800020',   // Burgundy
  ink: '#222222',     // Dark Graphite
  body: '#3F3F46',
  muted: '#71717A',
  faint: '#A1A1AA',
  border: '#E5DFD4',
  surface: '#FAFAFA', // Soft White
  page: '#F5F1EB',    // Warm Ivory
  orange: '#F97316',
  emerald: '#10B981',
  amber: '#F59E0B',
};

export const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

export const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
