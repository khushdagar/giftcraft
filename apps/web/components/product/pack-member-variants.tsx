'use client';

import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { resolveSwatchHex } from '@/lib/color-name';
import { RestockNotifyForm } from './restock-notify-form';

export interface PackMemberVariant {
  kind: string;
  value: string;
  hexColor: string | null;
  imageUrl: string | null;
}

export interface PackMember {
  id: string;
  name: string;
  quantity: number;
  image: string | null;
  variants: PackMemberVariant[];
  /** Draft/archived — no longer sellable. Shows a "notify me" form instead of options. */
  outOfStock?: boolean;
}

interface PackMemberVariantsProps {
  members: PackMember[];
  /** productId -> { kind -> chosen value } */
  selections: Record<string, Record<string, string>>;
  onChange: (productId: string, kind: string, value: string) => void;
}

const KIND_LABEL: Record<string, string> = { color: 'Colour', size: 'Size' };

function labelFor(kind: string) {
  return KIND_LABEL[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);
}

/** Distinct variant kinds on a member, in the order the admin sorted them. */
export function variantKinds(member: PackMember) {
  return Array.from(new Set(member.variants.map((v) => v.kind)));
}

/**
 * Per-product variant pickers for a curated pack.
 *
 * A pack bundles other products, and those members can each have their own
 * colours/sizes. The pack itself has no variants, so without this the buyer had
 * no way to say which colour of the bottle they wanted — every pack shipped
 * with whatever the warehouse picked. One selection covers ALL units of that
 * member (a member at ×4 ships 4 of the same colour).
 *
 * Every member is listed, including those with nothing to choose — a pack of 4
 * that showed only 3 rows read as "one item is missing" rather than "that item
 * has no options". Fixed members show a plain "No options" note instead.
 */
export function PackMemberVariants({ members, selections, onChange }: PackMemberVariantsProps) {
  // The panel only earns its place when at least one member is configurable
  // or out of stock (which also needs surfacing here).
  if (!members.some((m) => m.variants.length > 0 || m.outOfStock)) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-md border-2 border-bdr bg-white">
      <div className="border-b-2 border-bdr bg-gray-50 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Package className="h-4 w-4 text-em" />
          Choose your options
        </h3>
        <p className="mt-0.5 text-xs text-ink-3">
          Your choice applies to every unit of that item.
        </p>
      </div>

      <div className="divide-y divide-bdr">
        {members.map((member) => {
          const chosen = selections[member.id] ?? {};
          const kinds = variantKinds(member);
          return (
            <div
              key={member.id}
              className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4"
            >
              {/* Identity — an out-of-stock member loses its photo for a warning
                  icon, so the row reads as "unavailable" at a glance. */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-md ${
                    member.outOfStock ? 'bg-amber-50' : 'bg-gray-50'
                  }`}
                >
                  {member.outOfStock ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : member.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-3">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <p className="min-w-0 text-sm font-medium leading-snug text-ink">
                  <span className="line-clamp-2">{member.name}</span>
                  {member.quantity > 1 && (
                    <span className="font-normal text-ink-3"> ×{member.quantity}</span>
                  )}
                  {member.outOfStock && (
                    <span className="block text-xs font-normal text-amber-600">
                      Currently out of stock — fill the form to be notified when it&apos;s available.
                    </span>
                  )}
                </p>
              </div>

              {/* Options — fixed-width controls so every row lines up. An
                  out-of-stock member gets a notify form instead of pickers. */}
              <div className="grid flex-shrink-0 grid-cols-2 gap-2 sm:flex">
                {member.outOfStock ? (
                  <div className="col-span-2 sm:w-auto">
                    <RestockNotifyForm productId={member.id} productName={member.name} />
                  </div>
                ) : (
                  <>
                {/* Nothing to configure — say so, so the row isn't mistaken for
                    a control that failed to load. */}
                {kinds.length === 0 && (
                  <div className="col-span-2 sm:w-40">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                      Options
                    </span>
                    <span className="flex h-9 items-center rounded-md border border-dashed border-bdr bg-gray-50 px-2.5 text-sm text-ink-3">
                      As shown
                    </span>
                  </div>
                )}
                {kinds.map((kind) => {
                  const options = member.variants.filter((v) => v.kind === kind);
                  const value = chosen[kind] ?? '';
                  const swatch =
                    kind === 'color'
                      ? resolveSwatchHex(
                          value,
                          options.find((o) => o.value === value)?.hexColor ?? null
                        )
                      : null;
                  const single = options.length === 1;
                  return (
                    <label key={kind} className="block sm:w-40">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                        {labelFor(kind)}
                      </span>
                      {/* One option means there's nothing to choose — show it as
                          a plain value rather than a dropdown that does nothing. */}
                      {single ? (
                        <span className="flex h-9 items-center gap-2 rounded-md border border-bdr bg-gray-50 px-2.5 text-sm text-ink-2">
                          {swatch && (
                            <span
                              aria-hidden
                              className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-black/10"
                              style={{ backgroundColor: swatch }}
                            />
                          )}
                          <span className="truncate">{value}</span>
                        </span>
                      ) : (
                        <span className="relative flex h-9 items-center gap-2 rounded-md border-2 border-bdr bg-white pl-2.5 transition focus-within:border-em">
                          {swatch && (
                            <span
                              aria-hidden
                              className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-black/10"
                              style={{ backgroundColor: swatch }}
                            />
                          )}
                          <select
                            value={value}
                            onChange={(e) => onChange(member.id, kind, e.target.value)}
                            aria-label={`${labelFor(kind)} for ${member.name}`}
                            className="h-full w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-7 text-sm text-ink focus:outline-none"
                          >
                            {options.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.value}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2 h-4 w-4 text-ink-3"
                            aria-hidden
                          />
                        </span>
                      )}
                    </label>
                  );
                })}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
