/**
 * Type declaration for plain (non-module) CSS side-effect imports, e.g. the
 * `import "./globals.css"` in app/layout.tsx.
 *
 * Next ships declarations for `*.module.css` only (next/types/global.d.ts), so
 * plain stylesheets have no type. TypeScript used to silently ignore that, but
 * with `noUncheckedSideEffectImports` it reports the import as unresolved —
 * which is why this error appears in the editor while `tsc` stays clean: the
 * editor's TS server enables the check, our tsconfig does not.
 *
 * Declaring the module fixes it for both, regardless of that flag. Safe to
 * declare as a wildcard here because this project uses Tailwind and has no CSS
 * modules (CLAUDE.md §2).
 */
declare module '*.css';
