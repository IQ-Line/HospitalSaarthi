/// <reference path="../fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
} from "../ports.js";
import type { PatientFilters, PatientStatus } from "../domain/patient.types.js";
import type {
  ChangePatientStatusRequestBody,
  CreateAddressRequestBody,
  LinkIdentifierRequestBody,
  RegisterPatientRequestBody,
  UpdateAddressRequestBody,
  UpdatePatientRequestBody,
} from "../domain/api.types.js";
import { findPatientByDedupDemographics, registerPatient } from "../use-cases/register-patient.js";
import { normalizeIndianPhoneForEmpi } from "../lib/indian-phone.js";
import { isDuplicateRegistrationResult } from "../use-cases/register-patient.types.js";
import { updatePatient } from "../use-cases/update-patient.js";
import { searchPatients } from "../use-cases/search-patients.js";
import { getPatient } from "../use-cases/get-patient.js";
import { findPatientByAbhaAddress } from "../use-cases/find-patient-by-abha-address.js";
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
  findPatientByAbhaQuerySchema,
  findPatientByDemographicsBodySchema,
  searchPatientsQuerySchema,
  updateAddressBodySchema,
  updatePatientBodySchema,
} from "./patient-schemas.js";

const protectedRoute = { config: { authMode: "protected" as const } };

interface SearchPatientsQuerystring {
  name?: string;
  phone?: string;
  uhid?: string;
  abha_number?: string;
  status?: PatientStatus;
  page?: string;
  limit?: string;
}

interface HandlerDeps {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
  eventBus: EventBus;
  allocatePatientUhid: (tenantId: string) => Promise<string>;
}

export function registerPatientsHandler(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.post<{ Body: RegisterPatientRequestBody }>(
    "/patients",
    {
      ...protectedRoute,
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
            allocatePatientUhid: deps.allocatePatientUhid,
            eventBus: deps.eventBus,
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
      ...protectedRoute,
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

  app.get<{ Querystring: { abha_address: string } }>(
    "/patients/find",
    {
      ...protectedRoute,
      schema: {
        querystring: findPatientByAbhaQuerySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const match = await findPatientByAbhaAddress(
        { identifierRepo: deps.identifierRepo },
        tenantId,
        request.query.abha_address,
      );
      if (!match) return reply.code(404).send({ error: "Patient not found" });
      return reply.send({ patientId: match.patientId, id: match.patientId });
    },
  );

  app.post<{
    Body: {
      identifiers?: Array<{ type: string; value: string }>;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      gender?: import("../domain/patient.types.js").Gender;
      phone_number?: string;
      date_of_birth?: string;
      year_of_birth?: number;
      age_years?: number;
      age_months?: number;
      age_days?: number;
    };
  }>(
    "/patients/find-by-demographics",
    {
      ...protectedRoute,
      schema: {
        body: findPatientByDemographicsBodySchema,
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      if (body.first_name?.trim() && body.gender && body.phone_number?.trim()) {
        const phone = normalizeIndianPhoneForEmpi(body.phone_number);
        if (!phone) return reply.code(404).send({ error: "Patient not found" });

        const dob = body.date_of_birth?.trim();
        let yearOfBirth = body.year_of_birth ?? null;
        if (!yearOfBirth && dob) {
          const y = new Date(dob).getFullYear();
          if (!Number.isNaN(y) && y > 1900) yearOfBirth = y;
        }

        const match = await findPatientByDedupDemographics(
          { patientRepo: deps.patientRepo },
          tenantId,
          {
            first_name: body.first_name.trim(),
            middle_name: body.middle_name?.trim() || null,
            last_name: body.last_name?.trim() || null,
            gender: body.gender,
            phone_number: phone,
            date_of_birth: dob || null,
            year_of_birth: yearOfBirth,
            age_years: body.age_years ?? null,
            age_months: body.age_months ?? null,
            age_days: body.age_days ?? null,
          },
        );
        if (!match) return reply.code(404).send({ error: "Patient not found" });
        return reply.send({ patientId: match.id, id: match.id, score: 1 });
      }

      return reply.code(404).send({ error: "Patient not found" });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/patients/:id",
    {
      ...protectedRoute,
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
      ...protectedRoute,
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
      ...protectedRoute,
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
      ...protectedRoute,
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
      ...protectedRoute,
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
      ...protectedRoute,
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
      ...protectedRoute,
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
