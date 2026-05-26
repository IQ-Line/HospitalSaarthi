import type { FastifyInstance } from 'fastify';
import { AppError } from './errors.js';
import type { SmartParchaDeps } from './ports.js';
import { requestContextFromFastify } from './request-context.js';
import * as uc from './use-cases.js';

function sendSuccess(reply: import('fastify').FastifyReply, data: unknown) {
  return reply.send({ success: true, data });
}

export async function registerSmartParchaRoutes(
  app: FastifyInstance,
  deps: SmartParchaDeps,
): Promise<void> {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        success: false,
        message: err.message,
        code: err.code,
      });
    }
    app.log.error(err);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  });

  app.get('/visits/:visitId/full-context', async (req, reply) => {
    const ctx = requestContextFromFastify(req);
    const data = await uc.loadFullContext(deps, req.params.visitId, ctx);
    return sendSuccess(reply, data);
  });

  app.post('/visits/:visitId/save-prescription', async (req, reply) => {
    const ctx = requestContextFromFastify(req);
    const body = req.body as { prescription?: Record<string, unknown>; immunizations?: unknown[] };
    const data = await uc.savePrescription(
      deps,
      req.params.visitId,
      body.prescription ?? {},
      body.immunizations,
      ctx,
    );
    return sendSuccess(reply, data ?? { saved: true });
  });

  app.post('/visits/:visitId/end-consultation', async (req, reply) => {
    const ctx = requestContextFromFastify(req);
    const data = await uc.endConsultation(deps, req.params.visitId, req.body as Record<string, unknown>, ctx);
    return sendSuccess(reply, data);
  });

  app.post('/visits/:visitId/post-consultation', async (req, reply) => {
    const ctx = requestContextFromFastify(req);
    const data = await uc.postConsultation(deps, req.params.visitId, req.body as Record<string, unknown>, ctx);
    return sendSuccess(reply, data ?? { ok: true });
  });

  const saveAndIngestHandler = async (
    req: import('fastify').FastifyRequest<{ Params: { visitId: string } }>,
    reply: import('fastify').FastifyReply,
  ) => {
    const ctx = requestContextFromFastify(req);
    const body = req.body as {
      parchaContent?: unknown[];
      frame?: string;
      doctorId?: string;
      patientId?: string;
    };
    const data = await uc.saveAndIngest(
      deps,
      req.params.visitId,
      {
        parchaContent: (body.parchaContent ?? []) as import('./types.js').ParchaPageDto[],
        frame: body.frame,
        doctorId: body.doctorId ?? '',
        patientId: body.patientId ?? '',
      },
      ctx,
    );
    return sendSuccess(reply, data);
  };

  app.post('/:visitId/save-and-ingest', saveAndIngestHandler);
  /** Legacy HIMS path: `/v2/smart-parcha/:visitId/save-and-ingest` */
  app.post('/smart-parcha/:visitId/save-and-ingest', saveAndIngestHandler);
}
