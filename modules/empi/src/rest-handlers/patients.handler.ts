/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
  SequenceRepo,
} from "../ports.js";
import type { Gender, PatientFilters, PatientStatus } from "../domain/patient.types.js";
import type {
  ChangePatientStatusRequestBody,
  CreateAddressRequestBody,
  LinkIdentifierRequestBody,
  RegisterPatientRequestBody,
  UpdateAddressRequestBody,
  UpdatePatientRequestBody,
} from "../domain/api.types.js";
import { registerPatient } from "../use-cases/register-patient.js";
import { isDuplicateRegistrationResult } from "../use-cases/register-patient.types.js";
import { updatePatient } from "../use-cases/update-patient.js";
import { searchPatients } from "../use-cases/search-patients.js";
import { PatientSearchQueryError } from "../errors.js";
import { getPatient } from "../use-cases/get-patient.js";
import { changePatientStatus } from "../use-cases/change-patient-status.js";
import { linkIdentifier } from "../use-cases/link-identifier.js";
import {
  changePatientStatusBodySchema,
  createAddressBodySchema,
  createIdentifierBodySchema,
  createPatientBodySchema,
  paramsPatientAndAddressSchema,
  paramsPatientAndIdentifierSchema,
  paramsPatientIdSchema,
  searchPatientsQuerySchema,
  updateAddressBodySchema,
  updatePatientBodySchema,
} from "./patient-schemas.js";

interface SearchPatientsQuerystring {
  name?: string;
  phone?: string;
  mobile?: string;
  uhid?: string;
  abha_number?: string;
  status?: PatientStatus;
  gender?: Gender;
  sort?: "created_at" | "updated_at" | "full_name";
  order?: "asc" | "desc";
  page?: string;
  limit?: string;
}

interface HandlerDeps {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
  sequenceRepo: SequenceRepo;
  eventBus: EventBus;
  getTenantNumericCode: (tenantId: string) => Promise<string>;
}

export function registerPatientsHandler(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.post<{ Body: RegisterPatientRequestBody }>(
    "/patients",
    {
      schema: {
        body: createPatientBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      try {
        const result = await registerPatient(
          {
            patientRepo: deps.patientRepo,
            sequenceRepo: deps.sequenceRepo,
            eventBus: deps.eventBus,
            getTenantNumericCode: deps.getTenantNumericCode,
          },
          { ...body, iq_tenant_id: tenantId },
        );

        if (isDuplicateRegistrationResult(result)) {
          return reply.code(409).send(result);
        }
        return reply.code(201).send(result);
      } catch (err) {
        request.log.error({ err }, "registerPatient failed");
        throw err;
      }
    },
  );

  app.get<{ Querystring: SearchPatientsQuerystring }>(
    "/patients",
    {
      schema: {
        querystring: searchPatientsQuerySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const query = request.query;

      const filters: PatientFilters = {
        name: query.name,
        phone_number: query.phone,
        uhid: query.uhid,
        abha_number: query.abha_number,
        status: query.status,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      };

      const result = await searchPatients(
        { patientRepo: deps.patientRepo },
        tenantId,
        filters,
      );

      return reply.send(result);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/patients/:id",
    {
      schema: {
        params: paramsPatientIdSchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

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
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdatePatientRequestBody }>(
    "/patients/:id",
    {
      schema: {
        params: paramsPatientIdSchema,
        body: updatePatientBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

      const patient = await updatePatient(
        { patientRepo: deps.patientRepo, eventBus: deps.eventBus },
        tenantId,
        id,
        request.body,
      );

      if (!patient) return reply.code(404).send({ error: "Patient not found" });
      return reply.send(patient);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: ChangePatientStatusRequestBody;
  }>(
    "/patients/:id/status",
    {
      schema: {
        params: paramsPatientIdSchema,
        body: changePatientStatusBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;
      const { status } = request.body;

      const result = await changePatientStatus(
        { patientRepo: deps.patientRepo, eventBus: deps.eventBus },
        tenantId,
        id,
        status,
        null,
      );

      if (!result.ok) {
        if (result.error === "not_found") {
          return reply.code(404).send({ error: "Patient not found" });
        }
        return reply.code(409).send({
          error: "invalid_status_transition",
          from: result.from,
          to: result.to,
        });
      }
      return reply.send(result.patient);
    },
  );

  app.post<{
    Params: { id: string };
    Body: LinkIdentifierRequestBody;
  }>(
    "/patients/:id/identifiers",
    {
      schema: {
        params: paramsPatientIdSchema,
        body: createIdentifierBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id: patientId } = request.params;
      const body = request.body;

      const identifier = await linkIdentifier(
        { identifierRepo: deps.identifierRepo, eventBus: deps.eventBus },
        {
          iq_tenant_id: tenantId,
          patient_id: patientId,
          identifier_type: body.identifier_type,
          identifier_value: body.identifier_value,
          issuing_system: body.issuing_system,
          source_record_id: body.source_record_id,
          created_by: body.created_by,
        },
      );

      return reply.code(201).send(identifier);
    },
  );

  app.delete<{ Params: { id: string; identifierId: string } }>(
    "/patients/:id/identifiers/:identifierId",
    {
      schema: {
        params: paramsPatientAndIdentifierSchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { identifierId } = request.params;

      const result = await deps.identifierRepo.deactivate(
        tenantId,
        identifierId,
      );

      if (!result)
        return reply.code(404).send({ error: "Identifier not found" });
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { id: string }; Body: CreateAddressRequestBody }>(
    "/patients/:id/addresses",
    {
      schema: {
        params: paramsPatientIdSchema,
        body: createAddressBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id: patientId } = request.params;
      const body = request.body;

      const address = await deps.addressRepo.create({
        iq_tenant_id: tenantId,
        patient_id: patientId,
        address_type: body.address_type,
        street: body.street,
        city: body.city,
        district: body.district,
        state: body.state,
        pincode: body.pincode,
        created_by: body.created_by,
      });

      return reply.code(201).send(address);
    },
  );

  app.patch<{
    Params: { id: string; addressId: string };
    Body: UpdateAddressRequestBody;
  }>(
    "/patients/:id/addresses/:addressId",
    {
      schema: {
        params: paramsPatientAndAddressSchema,
        body: updateAddressBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { addressId } = request.params;

      const address = await deps.addressRepo.update(
        tenantId,
        addressId,
        request.body,
      );

      if (!address) return reply.code(404).send({ error: "Address not found" });
      return reply.send(address);
    },
  );
}
