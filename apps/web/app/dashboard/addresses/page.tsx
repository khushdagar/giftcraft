import { SavedAddressesManager } from '@/components/dashboard/saved-addresses-manager';

export default function SavedAddressesPage() {
  return (
    <div className="max-w-full">
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Saved Addresses</h1>
        <p className="mt-1 text-sm text-ink-2">
          Save delivery addresses once and reuse them at checkout.
        </p>
      </div>

      <SavedAddressesManager />
    </div>
  );
}
