import { BadRequestError } from './errors.js';
import type { SmartParchaDeps } from './ports.js';
import type {
  FullContextDto,
  ParchaPageDto,
  RequestContext,
  SaveAndIngestPayload,
  SaveAndIngestResult,
} from './types.js';

export async function loadFullContext(
  deps: SmartParchaDeps,
  visitId: string,
  ctx: RequestContext,
): Promise<FullContextDto> {
  const addendum = ctx.query.addendum === 'true' || ctx.query.addendum === '1';
  const data = await deps.hims.getFullContextDelegated(visitId, ctx, { addendum });
  const local = await deps.parcha.get(visitId);
  if (local?.length) {
    return { ...data, smartParcha: { parchaContent: local } };
  }
  return data;
}

export async function saveAndIngest(
  deps: SmartParchaDeps,
  visitId: string,
  payload: SaveAndIngestPayload,
  ctx: RequestContext,
): Promise<SaveAndIngestResult> {
  const { parchaContent, frame, doctorId, patientId } = payload;
  if (!Array.isArray(parchaContent)) {
    throw new BadRequestError('parchaContent array is required');
  }
  if (!doctorId || !patientId) {
    throw new BadRequestError('doctorId and patientId are required');
  }

  await deps.parcha.save(visitId, parchaContent, { doctorId, patientId });
  const result: SaveAndIngestResult = { saved: true };

  if (frame && frame.length > 80) {
    try {
      const aiResult = await deps.ai.extractFromFrame(visitId, frame, ctx);
      if (aiResult.success && !aiResult.skipped && aiResult.mappedFields) {
        result.aiResult = {
          mappedFields: aiResult.mappedFields,
          visitPadPrescription: aiResult.visitPadPrescription,
          skipped: false,
        };
      } else if (aiResult.skipped) {
        result.aiResult = {
          skipped: true,
          mappedFields: aiResult.mappedFields,
          visitPadPrescription: aiResult.visitPadPrescription,
        };
      }
    } catch {
      /* non-blocking */
    }
  }

  return result;
}

export function savePrescription(
  deps: SmartParchaDeps,
  visitId: string,
  prescription: Record<string, unknown>,
  immunizations: unknown[] | undefined,
  ctx: RequestContext,
) {
  if (!prescription) throw new BadRequestError('prescription is required');
  return deps.hims.savePrescriptionDraft(visitId, prescription, immunizations, ctx);
}

export function endConsultation(
  deps: SmartParchaDeps,
  visitId: string,
  body: Record<string, unknown>,
  ctx: RequestContext,
) {
  if (!body.prescription) throw new BadRequestError('prescription is required');
  return deps.hims.endConsultation(visitId, body, ctx);
}

export function postConsultation(
  deps: SmartParchaDeps,
  visitId: string,
  body: Record<string, unknown>,
  ctx: RequestContext,
) {
  return deps.hims.postConsultation(visitId, body, ctx);
}
