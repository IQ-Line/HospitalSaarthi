import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
  SequenceRepo,
} from "../ports.js";
import { registerPatient } from "../use-cases/register-patient.js";
import { updatePatient } from "../use-cases/update-patient.js";
import { searchPatients } from "../use-cases/search-patients.js";
import { getPatient } from "../use-cases/get-patient.js";
import { changePatientStatus } from "../use-cases/change-patient-status.js";
import { linkIdentifier } from "../use-cases/link-identifier.js";

interface HandlerDeps {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
  sequenceRepo: SequenceRepo;
  eventBus: EventBus;
  getTenantNumericCode: (tenantId: string) => string;
}

/**
 * Never pass raw strings to Postgres uuid columns. Placeholders like `$TENANT`
 * must be rejected here — especially when `request.tenantId` is set from env/docs
 * without shell expansion.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TENANT_HEADER_NAMES = [
  "iq_tenant_id",
  "iq-tenant-id",
  "x-iq-tenant-id",
] as const;

function normalizeUuid(raw: string | undefined): string | undefined {
  if (raw === undefined || typeof raw !== "string") return undefined;
  let t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  if (t.startsWith("{") && t.endsWith("}")) {
    t = t.slice(1, -1).trim();
  }
  const urn = "urn:uuid:";
  if (t.toLowerCase().startsWith(urn)) {
    t = t.slice(urn.length).trim();
  }
  if (!UUID_REGEX.test(t)) return undefined;
  return t.toLowerCase();
}

function headerValue(req: any, name: string): string | undefined {
  const v = req?.headers?.[name] as string | string[] | undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

function tenantFromHeaders(request: any): string | undefined {
  for (const name of TENANT_HEADER_NAMES) {
    const v = normalizeUuid(headerValue(request, name));
    if (v) return v;
  }
  return undefined;
}

function tenantFromQuery(request: any): string | undefined {
  const q = request?.query as Record<string, string | string[] | undefined> | undefined;
  if (!q) return undefined;
  const raw = q["iq_tenant_id"];
  const s = Array.isArray(raw) ? raw[0] : raw;
  return normalizeUuid(s);
}

function getTenantIdFromRequest(
  request: any,
  body?: Record<string, unknown>,
): string | undefined {
  const fromRequest = normalizeUuid(request?.tenantId as string | undefined);
  if (fromRequest) return fromRequest;

  const fromHeader = tenantFromHeaders(request);
  if (fromHeader) return fromHeader;

  const fromQuery = tenantFromQuery(request);
  if (fromQuery) return fromQuery;

  const fromBody = normalizeUuid(body?.["iq_tenant_id"] as string | undefined);
  if (fromBody) return fromBody;

  return undefined;
}

const MSG_TENANT_CONTEXT =
  "Missing or invalid tenant UUID. Use header iq_tenant_id or iq-tenant-id, GET ?iq_tenant_id=, or JSON iq_tenant_id (same UUID used when the patient was created).";

export function registerPatientsHandler(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  // POST /patients — register a new patient
  app.post("/patients", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const tenantId = getTenantIdFromRequest(request as any, body);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }

    const patient = await registerPatient(
      {
        patientRepo: deps.patientRepo,
        sequenceRepo: deps.sequenceRepo,
        eventBus: deps.eventBus,
        getTenantNumericCode: deps.getTenantNumericCode,
      },
      { ...body, iq_tenant_id: tenantId } as any,
    );

    return reply.code(201).send(patient);
  });

  // GET /patients — search/list patients
  app.get("/patients", async (request, reply) => {
    const query = request.query as Record<string, string>;
    const tenantId = getTenantIdFromRequest(request as any);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }

    const result = await searchPatients(
      { patientRepo: deps.patientRepo },
      tenantId,
      {
        name: query["name"],
        phone_number: query["phone"],
        uhid: query["uhid"],
        abha_number: query["abha_number"],
        status: query["status"] as any,
        page: query["page"] ? Number(query["page"]) : undefined,
        limit: query["limit"] ? Number(query["limit"]) : undefined,
      },
    );

    return reply.send(result);
  });

  // GET /patients/:id — get patient with addresses and identifiers
  app.get("/patients/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantIdFromRequest(request as any);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }
    const detail = await getPatient(
      {
        patientRepo: deps.patientRepo,
        addressRepo: deps.addressRepo,
        identifierRepo: deps.identifierRepo,
      },
      tenantId,
      id,
    );

    if (!detail) return reply.code(404).send({ error: "Patient not found" });
    return reply.send(detail);
  });

  // PATCH /patients/:id — update demographics
  app.patch("/patients/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const tenantId = getTenantIdFromRequest(request as any, body);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }

    const { iq_tenant_id: _tenantFromBody, ...demographics } = body;

    const patient = await updatePatient(
      { patientRepo: deps.patientRepo, eventBus: deps.eventBus },
      tenantId,
      id,
      demographics as any,
    );

    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    return reply.send(patient);
  });

  // PATCH /patients/:id/status — change status
  app.patch("/patients/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const bodyRecord = request.body as Record<string, unknown>;
    const tenantId = getTenantIdFromRequest(request as any, bodyRecord);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }
    const { status } = request.body as { status: string };

    const patient = await changePatientStatus(
      { patientRepo: deps.patientRepo, eventBus: deps.eventBus },
      tenantId,
      id,
      status as any,
      null,
    );

    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    return reply.send(patient);
  });

  // POST /patients/:id/identifiers — link an identifier
  app.post("/patients/:id/identifiers", async (request, reply) => {
    const { id: patientId } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const tenantId = getTenantIdFromRequest(request as any, body);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }

    const identifier = await linkIdentifier(
      { identifierRepo: deps.identifierRepo, eventBus: deps.eventBus },
      {
        iq_tenant_id: tenantId,
        patient_id: patientId,
        identifier_type: body["identifier_type"] as any,
        identifier_value: body["identifier_value"] as string,
        issuing_system: body["issuing_system"] as string | undefined,
        created_by: body["created_by"] as string | undefined,
      },
    );

    return reply.code(201).send(identifier);
  });

  // DELETE /patients/:id/identifiers/:identifierId — deactivate
  app.delete(
    "/patients/:id/identifiers/:identifierId",
    async (request, reply) => {
      const { identifierId } = request.params as { identifierId: string };
      const tenantId = getTenantIdFromRequest(request as any);
      if (!tenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: MSG_TENANT_CONTEXT,
        });
      }
      const result = await deps.identifierRepo.deactivate(
        tenantId,
        identifierId,
      );

      if (!result)
        return reply.code(404).send({ error: "Identifier not found" });
      return reply.code(204).send();
    },
  );

  // POST /patients/:id/addresses — add address
  app.post("/patients/:id/addresses", async (request, reply) => {
    const { id: patientId } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const tenantId = getTenantIdFromRequest(request as any, body);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }
    const address = await deps.addressRepo.create({
      iq_tenant_id: tenantId,
      patient_id: patientId,
      address_type: body["address_type"] as any,
      street: body["street"] as string | undefined,
      city: body["city"] as string | undefined,
      district: body["district"] as string | undefined,
      state: body["state"] as string | undefined,
      pincode: body["pincode"] as string | undefined,
      created_by: body["created_by"] as string | undefined,
    });

    return reply.code(201).send(address);
  });

  // PATCH /patients/:id/addaa27c54f-42df-4b81-8617-05a3d0c9be93esses/:addressId — update address
  app.patch("/patients/:id/addresses/:addressId", async (request, reply) => {
    const { addressId } = request.params as { addressId: string };
    const body = request.body as Record<string, unknown>;

    const tenantId = getTenantIdFromRequest(request as any, body);
    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: MSG_TENANT_CONTEXT,
      });
    }
    const address = await deps.addressRepo.update(tenantId, addressId, body as any);

    if (!address) return reply.code(404).send({ error: "Address not found" });
    return reply.send(address);
  });
}
