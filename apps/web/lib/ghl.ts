/**
 * GoHighLevel lead fetching — shared by the Enquiries tab and the admin
 * notification bell.
 *
 * GHL merges repeat submitters into one contact (it dedupes on phone/email), so
 * contacts alone lose earlier enquiries. Leads are therefore built from form
 * SUBMISSIONS — one row per enquiry, nothing overwritten — with contacts used
 * only to enrich them, plus contacts that never submitted a form.
 *
 * Requires GHL_API_KEY (Private Integration token) and GHL_LOCATION_ID.
 * Contacts need `contacts.readonly`; full enquiry detail needs `forms.readonly`
 * and `locations/customFields.readonly`. Without those scopes the extra calls
 * fail quietly and leads fall back to contact-level data.
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';

export interface GhlDetailField {
  label: string;
  value: string;
}

export interface GhlLead {
  id: string;
  origin: 'form' | 'contact';
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  tags: string[];
  dateAdded: string | null;
  formName: string | null;
  message: string | null;
  productName: string | null;
  quantity: number | null;
  detail: GhlDetailField[];
}

export type GhlResult =
  | { status: 'not_configured' }
  | { status: 'ok'; leads: GhlLead[]; missingScopes: string[] }
  | { status: 'error'; error: string; httpStatus?: number };

// Plumbing on a submission payload — not worth showing to an admin.
const SUBMISSION_SKIP_KEYS = new Set([
  'id',
  'contactId',
  'formId',
  'form_id',
  'name',
  'first_name',
  'last_name',
  'full_name',
  'email',
  'phone',
  'createdAt',
  'locationId',
  'location_id',
  'eventData',
  'others',
  'fieldsOriSequance',
  'submissionId',
  'signatureHash',
  'contact_id',
  'country_code',
]);

const CONTACT_SKIP_KEYS = new Set([
  'id',
  'locationId',
  'contactName',
  'firstName',
  'lastName',
  'firstNameLowerCase',
  'lastNameLowerCase',
  'fullNameLowerCase',
  'email',
  'emailLowerCase',
  'phone',
  'companyName',
  'tags',
  'dateAdded',
  'dateUpdated',
  'customFields',
  'additionalEmails',
  'additionalPhones',
  'attributions',
  'followers',
  'businessId',
  'assignedTo',
  'type',
  'dnd',
  'dndSettings',
]);

const LABELS: Record<string, string> = {
  address1: 'Address',
  city: 'City',
  state: 'State',
  postalCode: 'Postal code',
  country: 'Country',
  website: 'Website',
  source: 'Source',
  dateOfBirth: 'Date of birth',
  timezone: 'Timezone',
  ip: 'IP address',
  terms_and_conditions: 'Terms accepted',
};

// "what_do_you_need" / "contact.budget_range" → "What do you need"
const humanize = (key: string) => {
  const base = key.split('.').pop() || key;
  const words = base
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const asText = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const parts = value.map(asText).filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    const inner = value as Record<string, unknown>;
    // GHL sometimes nests a chosen option as { value } / { url } / { name }.
    for (const k of ['value', 'label', 'name', 'url']) {
      if (inner[k] !== undefined) return asText(inner[k]);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return String(value);
};

// Fuzzy pick of the enquiry essentials out of arbitrary form fields.
const pickField = (fields: GhlDetailField[], needles: string[]) =>
  fields.find((f) => needles.some((n) => f.label.toLowerCase().includes(n)))?.value ?? null;

const toQuantity = (raw: string | null) => {
  if (!raw) return null;
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

// The bell polls every 60s per admin — a short cache keeps that off GHL's rate
// limit while still feeling live.
const CACHE_TTL_MS = 30_000;
let cache: { at: number; result: GhlResult } | null = null;

export async function fetchGhlLeads(): Promise<GhlResult> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.result;
  const result = await load();
  // Never cache transport errors — a retry should hit GHL again.
  if (result.status !== 'error') cache = { at: Date.now(), result };
  return result;
}

async function load(): Promise<GhlResult> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) return { status: 'not_configured' };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Version: '2021-07-28',
    Accept: 'application/json',
  };

  const get = async (path: string) => {
    const res = await fetch(`${GHL_BASE}/${path}`, { headers, cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      const err: any = new Error(`GHL ${path} failed (${res.status}): ${text}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  // Optional calls — a missing scope must not break the whole feed.
  const missingScopes: string[] = [];
  const optional = async (path: string, scope: string) => {
    try {
      return await get(path);
    } catch (error: any) {
      console.warn('GHL optional fetch skipped:', error?.message);
      missingScopes.push(scope);
      return null;
    }
  };

  try {
    const loc = encodeURIComponent(locationId);

    const [contactsRes, submissionsRes, formsRes, customFieldsRes] = await Promise.all([
      get(`contacts/?locationId=${loc}&limit=100`),
      optional(`forms/submissions?locationId=${loc}&limit=100`, 'forms.readonly'),
      optional(`forms/?locationId=${loc}&limit=100`, 'forms.readonly'),
      optional(`locations/${loc}/customFields`, 'locations/customFields.readonly'),
    ]);

    // id → readable label for contact custom fields
    const fieldNames: Record<string, string> = {};
    (customFieldsRes?.customFields || []).forEach((f: any) => {
      if (f?.id) fieldNames[f.id] = f.name || humanize(f.fieldKey || f.id);
    });

    const formNames: Record<string, string> = {};
    (formsRes?.forms || []).forEach((f: any) => {
      if (f?.id) formNames[f.id] = f.name;
    });

    const contacts: any[] = contactsRes.contacts || [];
    const contactById: Record<string, any> = {};
    contacts.forEach((c) => {
      contactById[c.id] = c;
    });

    // Contact-level extras (custom fields + stray attributes), reused by every
    // submission from that contact.
    const contactDetail = (c: any): GhlDetailField[] => {
      const out: GhlDetailField[] = [];
      const push = (label: string, raw: unknown) => {
        const value = asText(raw);
        if (value) out.push({ label, value });
      };
      Object.entries(c || {}).forEach(([key, raw]) => {
        if (CONTACT_SKIP_KEYS.has(key)) return;
        if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return;
        push(LABELS[key] || humanize(key), raw);
      });
      (c?.customFields || []).forEach((f: any) => {
        push(fieldNames[f.id] || humanize(f.id), f.value ?? f.fieldValue);
      });
      return out;
    };

    const dedupe = (fields: GhlDetailField[]) => {
      const seen = new Set<string>();
      return fields.filter((f) => {
        const k = `${f.label.toLowerCase()}|${f.value}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };

    const build = (base: {
      id: string;
      origin: 'form' | 'contact';
      name: string | null;
      email: string | null;
      phone: string | null;
      contact: any;
      createdAt: string | null;
      formName: string | null;
      fields: GhlDetailField[];
    }): GhlLead => {
      const detail = dedupe(base.fields);
      return {
        id: base.id,
        origin: base.origin,
        name: base.name,
        email: base.email,
        phone: base.phone,
        companyName:
          base.contact?.companyName ||
          pickField(detail, ['company', 'organisation', 'organization']),
        tags: Array.isArray(base.contact?.tags) ? base.contact.tags : [],
        dateAdded: base.createdAt,
        formName: base.formName,
        message: pickField(detail, ['message', 'requirement', 'enquiry', 'note', 'comment']),
        productName: pickField(detail, ['product', 'gift', 'hamper', 'item', 'interested in']),
        quantity: toQuantity(pickField(detail, ['quantity', 'qty', 'pieces', 'units'])),
        detail,
      };
    };

    const submissions: any[] = submissionsRes?.submissions || [];
    const contactsWithSubmission = new Set<string>();

    // ── One row per form submission ────────────────────────────────────────
    const submissionLeads = submissions.map((s) => {
      const others = s.others || {};
      const contact = s.contactId ? contactById[s.contactId] : undefined;
      if (s.contactId) contactsWithSubmission.add(s.contactId);

      const fields: GhlDetailField[] = [];
      const push = (label: string, raw: unknown) => {
        const value = asText(raw);
        if (value) fields.push({ label, value });
      };

      Object.entries({ ...s, ...others }).forEach(([key, raw]) => {
        if (SUBMISSION_SKIP_KEYS.has(key)) return;
        if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return;
        push(LABELS[key] || humanize(key), raw);
      });

      // Attribution lives in a nested blob — surface the useful bits only.
      const ev = others.eventData || {};
      push('Lead source', ev.source);
      push('Form page', ev.page?.url || ev.documentURL);

      fields.push(...contactDetail(contact));

      return build({
        id: `sub-${s.id}`,
        origin: 'form',
        name:
          s.name ||
          [others.first_name, others.last_name].filter(Boolean).join(' ') ||
          contact?.contactName ||
          null,
        email: s.email || others.email || contact?.email || null,
        phone: others.phone || contact?.phone || null,
        contact,
        createdAt: s.createdAt || null,
        formName: formNames[s.formId] || (s.formId ? 'Form' : null),
        fields,
      });
    });

    // ── Contacts that never submitted a form (manual adds, chat, calls) ────
    const contactLeads = contacts
      .filter((c) => !contactsWithSubmission.has(c.id))
      .map((c) =>
        build({
          id: `contact-${c.id}`,
          origin: 'contact',
          name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
          email: c.email || null,
          phone: c.phone || null,
          contact: c,
          createdAt: c.dateAdded || null,
          formName: null,
          fields: contactDetail(c),
        })
      );

    const leads = [...submissionLeads, ...contactLeads].sort((a, b) =>
      (b.dateAdded || '').localeCompare(a.dateAdded || '')
    );

    return { status: 'ok', leads, missingScopes: Array.from(new Set(missingScopes)) };
  } catch (error: any) {
    console.error('GHL leads error:', error?.message || error);
    if (error?.status) {
      return {
        status: 'error',
        error: `GoHighLevel API error (${error.status})`,
        httpStatus: error.status,
      };
    }
    return { status: 'error', error: 'Failed to reach GoHighLevel' };
  }
}

/** Leads that arrived in the last `days` days — used for the bell. */
export function recentLeads(leads: GhlLead[], days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return leads.filter((l) => l.dateAdded && new Date(l.dateAdded).getTime() >= cutoff);
}
