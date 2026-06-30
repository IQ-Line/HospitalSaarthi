import { describe, expect, it } from 'vitest';
import {
  mapInventoryCategoryRows,
  mapInventoryHsnGstRow,
  mapInventoryStoreTypeRow,
  mapVisitpadManufacturerRow,
} from './mappers';

describe('inventory master API mappers', () => {
  it('maps category rows and resolves parent names', () => {
    const rows = mapInventoryCategoryRows([
      {
        id: 'parent-id',
        iq_tenant_id: null,
        name: 'OPEX',
        parent_category_id: null,
        description: null,
        is_active: true,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'child-id',
        iq_tenant_id: null,
        name: 'Medicine',
        parent_category_id: 'parent-id',
        description: null,
        is_active: true,
        is_deleted: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[1]?.parent_category_id).toBe('parent-id');
    expect(rows[1]?.parent_category).toBe('OPEX');
  });

  it('maps HSN/GST numeric strings', () => {
    const row = mapInventoryHsnGstRow({
      id: '1',
      iq_tenant_id: null,
      hsn_code: '3004',
      effective_from: '2026-01-01',
      cgst_pct: '6',
      sgst_pct: '6',
      igst_pct: '12',
      supporting_document_url: null,
      remarks: null,
      is_active: true,
      is_deleted: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(row.cgst_percent).toBe(6);
    expect(row.activation_date).toBe('2026-01-01');
  });

  it('maps store type capability flags', () => {
    const row = mapInventoryStoreTypeRow({
      id: '1',
      iq_tenant_id: null,
      code: 'ST-0001',
      name: 'Main Store',
      description: '',
      can_receive_stock: true,
      can_dispense: false,
      can_issue_to_ward: false,
      track_batch_expiry: true,
      indent_authority: false,
      default_indent_target_store_id: null,
      is_active: true,
      is_deleted: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(row.receive_stock).toBe(true);
    expect(row.dispense).toBe(false);
    expect(row.store_type).toBe('Main Store');
  });

  it('maps visitpad manufacturers for inventory tab', () => {
    const row = mapVisitpadManufacturerRow({
      id: '1',
      iq_tenant_id: null,
      code: 'CIPLA',
      display_name: 'Cipla Ltd',
      display_order: 0,
      is_active: true,
      is_deleted: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(row.manufacturer).toBe('Cipla Ltd');
    expect(row.code).toBe('CIPLA');
  });
});
