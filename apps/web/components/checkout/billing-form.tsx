'use client';

import { useState } from 'react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

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
  const [gstinError, setGstinError] = useState('');

  const validateGSTIN = (value: string) => {
    const v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length === 15) {
      const valid = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9Z][A-Z][0-9]$/.test(v);
      setGstinError(valid ? '' : 'Invalid GSTIN format');
    }
    return v;
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = validateGSTIN(e.target.value);
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
          className="form-input"
          placeholder="TechCorp India Pvt. Ltd."
          value={data.companyName}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
        />
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
            className="form-input"
            placeholder="AAACT1234F"
            maxLength={10}
            value={data.pan}
            onChange={(e) => onChange({ ...data, pan: e.target.value.toUpperCase() })}
          />
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

      <div className="border-t border-[#E8E8E3] pt-4 mb-4">
        <label className="form-label mb-3">Company Address</label>

        <div className="form-group">
          <input
            type="text"
            className="form-input"
            placeholder="Address Line 1 *"
            value={data.address1}
            onChange={(e) => onChange({ ...data, address1: e.target.value })}
          />
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
              className="form-input"
              placeholder="City *"
              value={data.city}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
            />
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
              className="form-input"
              placeholder="Pincode *"
              maxLength={6}
              value={data.pincode}
              onChange={(e) => onChange({ ...data, pincode: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
