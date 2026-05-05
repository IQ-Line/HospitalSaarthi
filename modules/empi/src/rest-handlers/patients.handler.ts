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

export function registerPatientsHandler(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  // POST /patients — register a new patient
  app.post("/patients", async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const body = request.body as Record<string, unknown>;

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
    const tenantId = (request as any).tenantId as string;
    const query = request.query as Record<string, string>;

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
    const tenantId = (request as any).tenantId as string;
    const { id } = request.params as { id: string };

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
    const tenantId = (request as any).tenantId as string;
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const patient = await updatePatient(
      { patientRepo: deps.patientRepo, eventBus: deps.eventBus },
      tenantId,
      id,
      body as any,
    );

    if (!patient) return reply.code(404).send({ error: "Patient not found" });
    return reply.send(patient);
  });

  // PATCH /patients/:id/status — change status
  app.patch("/patients/:id/status", async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const { id } = request.params as { id: string };
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
    const tenantId = (request as any).tenantId as string;
    const { id: patientId } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

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
      const tenantId = (request as any).tenantId as string;
      const { identifierId } = request.params as { identifierId: string };

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
    const tenantId = (request as any).tenantId as string;
    const { id: patientId } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

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

  // PATCH /patients/:id/addresses/:addressId — update address
  app.patch("/patients/:id/addresses/:addressId", async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const { addressId } = request.params as { addressId: string };
    const body = request.body as Record<string, unknown>;

    const address = await deps.addressRepo.update(tenantId, addressId, body as any);

    if (!address) return reply.code(404).send({ error: "Address not found" });
    return reply.send(address);
  });
}
