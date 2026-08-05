'use client';

import { useState } from 'react';
import { FieldError } from '@/components/ui/field-error';
import {
  validateGstin,
  validateName,
  validatePan,
  validatePincode,
  validateText,
} from '@/lib/validation';

// Was a local, partial copy (21 entries, no UTs and several states missing) —
// use the shared A–Z list so every address form offers the same options.
import { INDIAN_STATES } from '@/lib/constants';

export interface BillingFormData {
  companyName: string;
  gstin: string;
  pan: string;
  poNumber: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
}

interface BillingFormProps {
  data: BillingFormData;
  onChange: (data: BillingFormData) => void;
}

export function BillingForm({ data, onChange }: BillingFormProps) {
  const [noGstin, setNoGstin] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const showIf = (field: string, message: string | null) =>
    touched[field] ? message ?? undefined : undefined;

  const errors = {
    companyName: showIf('companyName', validateName(data.companyName, 'Company name')),
    gstin: showIf('gstin', validateGstin(data.gstin)),
    pan: showIf('pan', validatePan(data.pan)),
    address1: showIf('address1', validateText(data.address1, 'Address line 1', { min: 5, max: 200 })),
    city: showIf('city', validateName(data.city, 'City')),
    pincode: showIf('pincode', validatePincode(data.pincode)),
  };

  const gstinError = errors.gstin;

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    onChange({ ...data, gstin: v });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7 mb-4">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">
        🏢 Billing Information
      </h3>

      <div className="form-group">
        <label className="form-label">
          Company Name <span className="text-[#C4402A]">*</span>
        </label>
        <input
          type="text"
          className={`form-input ${errors.companyName ? 'error' : ''}`}
          placeholder="TechCorp India Pvt. Ltd."
          maxLength={120}
          value={data.companyName}
          aria-invalid={!!errors.companyName}
          onBlur={() => touch('companyName')}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
        />
        <FieldError message={errors.companyName} />
      </div>

      <div className="form-group">
        <label className="form-label">
          GSTIN <span className="optional">(for GST invoice)</span>
        </label>
        <input
          type="text"
          className={`form-input ${gstinError ? 'error' : ''}`}
          placeholder="07AAACT1234F1ZP"
          maxLength={15}
          value={data.gstin}
          aria-invalid={!!gstinError}
          onBlur={() => touch('gstin')}
          onChange={handleGstinChange}
          disabled={noGstin}
        />
        {gstinError && <div className="form-input-error">{gstinError}</div>}
        <div className="form-input-hint">
          Format: 2-digit state code + 10-char PAN + 1 entity + Z + 1 checksum
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={noGstin}
            onChange={(e) => {
              setNoGstin(e.target.checked);
              if (e.target.checked) {
                onChange({ ...data, gstin: '' });
              }
            }}
          />
          I don't have a GSTIN
        </label>
      </div>

      <div className="frow fr2 mb-4">
        <div className="form-group">
          <label className="form-label">
            PAN Number <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.pan ? 'error' : ''}`}
            placeholder="AAACT1234F"
            maxLength={10}
            value={data.pan}
            aria-invalid={!!errors.pan}
            onBlur={() => touch('pan')}
            onChange={(e) => onChange({ ...data, pan: e.target.value.toUpperCase() })}
          />
          <FieldError message={errors.pan} />
        </div>
        <div className="form-group">
          <label className="form-label">
            PO Number <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="PO-2026-0847"
            value={data.poNumber}
            onChange={(e) => onChange({ ...data, poNumber: e.target.value })}
          />
        </div>
      </div>

      <div className="border-t border-[#E5DFD4] pt-4 mb-4">
        <label className="form-label mb-3">Company Address</label>

        <div className="form-group">
          <input
            type="text"
            className={`form-input ${errors.address1 ? 'error' : ''}`}
            placeholder="Address Line 1 *"
            maxLength={200}
            value={data.address1}
            aria-invalid={!!errors.address1}
            onBlur={() => touch('address1')}
            onChange={(e) => onChange({ ...data, address1: e.target.value })}
          />
          <FieldError message={errors.address1} />
        </div>

        <div className="form-group">
          <input
            type="text"
            className="form-input"
            placeholder="Address Line 2 (optional)"
            value={data.address2}
            onChange={(e) => onChange({ ...data, address2: e.target.value })}
          />
        </div>

        <div className="frow fr3">
          <div className="form-group">
            <input
              type="text"
              className={`form-input ${errors.city ? 'error' : ''}`}
              placeholder="City *"
              maxLength={60}
              value={data.city}
              aria-invalid={!!errors.city}
              onBlur={() => touch('city')}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
            />
            <FieldError message={errors.city} />
          </div>
          <div className="form-group">
            <select
              className="form-input form-select"
              value={data.state}
              onChange={(e) => onChange({ ...data, state: e.target.value })}
            >
              <option value="">State *</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <input
              type="text"
              className={`form-input ${errors.pincode ? 'error' : ''}`}
              placeholder="Pincode *"
              maxLength={6}
              inputMode="numeric"
              value={data.pincode}
              aria-invalid={!!errors.pincode}
              onBlur={() => touch('pincode')}
              onChange={(e) =>
                onChange({ ...data, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
              }
            />
            <FieldError message={errors.pincode} />
          </div>
        </div>
      </div>
    </div>
  );
}
