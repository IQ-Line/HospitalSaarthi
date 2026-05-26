import type { AiExtractPort } from '../ports.js';
import type { RequestContext } from '../types.js';

export class MockAiExtractAdapter implements AiExtractPort {
  async extractFromFrame(
    _visitId: string,
    frame: string,
    _ctx: RequestContext,
  ) {
    if (!frame || frame.length < 80) {
      return { success: true, skipped: true };
    }
    return {
      success: true,
      mappedFields: { chief_complaints: 'Fever' },
      visitPadPrescription: {
        chiefComplaints: [{ complaint: 'Fever', severity: 'moderate' }],
      },
    };
  }
}
