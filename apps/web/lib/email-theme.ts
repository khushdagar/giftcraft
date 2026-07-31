// Shared palette and escaping helpers for every outbound email.
// Kept dependency-free so the HTML builders can be unit-tested in isolation.
// Brand palette from CLAUDE.md.

export const COLORS = {
  navy: '#1A3C6E',
  ink: '#1A1A1A',
  body: '#3F3F46',
  muted: '#71717A',
  faint: '#A1A1AA',
  border: '#E4E4E7',
  surface: '#FAFAFA',
  page: '#F4F4F5',
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
