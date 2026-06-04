import { z } from 'zod';

export const doctorTariffRowSchema = z.object({
  service_id: z.string().uuid().optional(),
  department_id: z.string(),
  room_number: z.string().default(''),
  base_price: z.coerce.number().min(0).max(3000),
  tax_percentage: z.coerce.number().min(0).max(100),
  opd_days: z.array(z.string()).default([]),
});

export type DoctorTariffFormRow = z.infer<typeof doctorTariffRowSchema>;

export const EMPTY_DOCTOR_TARIFF_ROW: DoctorTariffFormRow = {
  department_id: '',
  room_number: '',
  base_price: 0,
  tax_percentage: 0,
  opd_days: [],
};
