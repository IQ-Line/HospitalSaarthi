import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { createAdmissionRepo } from "./admission.repo.js";
import type { Admission, AdmissionRepo, AdmissionSource, AdmissionType, PayerType } from "./domain/admission.js";
import { toApi } from "./domain/admission.js";

export interface IpdRouterOptions {
  db?: DbInstance;
  useMock?: boolean;
}

const PUBLIC = { config: { authMode: "public" as const } };
const SAMPLE_BODY = {
  admission_source: "DIRECT",
  admission_type: "IPD",
  patient_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  facility_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  patient_uhid: "UHID-00001",
  patient_full_name: "Rajesh Kumar",
};

const now = () => new Date().toISOString();
const notFound = (reply: FastifyReply) => reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Admission not found" });
const bad = (reply: FastifyReply, message: string) => reply.code(400).send({ statusCode: 400, error: "Bad Request", message });
const conflict = (reply: FastifyReply, message: string) => reply.code(409).send({ statusCode: 409, error: "Conflict", message });

async function newAdmission(
  repo: AdmissionRepo,
  tenantId: string,
  body: Record<string, unknown>,
  idempotencyKey: string | null,
): Promise<Admission> {
  const ts = now();
  return {
    admission_id: randomUUID(),
    iq_tenant_id: tenantId,
    admission_number: await repo.nextAdmissionNumber(tenantId),
    patient_id: String(body.patient_id),
    registration_visit_id: body.registration_visit_id ? String(body.registration_visit_id) : null,
    source_visit_id: body.source_visit_id ? String(body.source_visit_id) : null,
    admission_type: body.admission_type as AdmissionType,
    admission_source: body.admission_source as AdmissionSource,
    facility_id: String(body.facility_id),
    department_id: body.department_id ? String(body.department_id) : null,
    intended_ward_code: body.intended_ward_code ? String(body.intended_ward_code) : null,
    admitting_doctor_id: body.admitting_doctor_id ? String(body.admitting_doctor_id) : null,
    attending_doctor_id: body.attending_doctor_id ? String(body.attending_doctor_id) : null,
    status: "draft",
    admission_datetime: null,
    expected_discharge_date: null,
    chief_complaint: body.chief_complaint ? String(body.chief_complaint) : null,
    provisional_diagnosis: body.provisional_diagnosis ? String(body.provisional_diagnosis) : null,
    payer_type: (body.payer_type as PayerType | undefined) ?? "self",
    insurance_reference: body.insurance_reference ? String(body.insurance_reference) : null,
    companion_name: body.companion_name ? String(body.companion_name) : null,
    companion_phone: body.companion_phone ? String(body.companion_phone) : null,
    remarks: body.remarks ? String(body.remarks) : null,
    mother_admission_id: body.mother_admission_id ? String(body.mother_admission_id) : null,
    deposit_required: body.deposit_required === true,
    deposit_amount: typeof body.deposit_amount === "number" ? String(body.deposit_amount) : null,
    deposit_bill_id: null,
    deposit_collected_at: null,
    ward_code: null,
    ward_name: null,
    bed_label: null,
    bed_assigned_at: null,
    patient_uhid: String(body.patient_uhid),
    patient_full_name: String(body.patient_full_name),
    patient_phone: body.patient_phone ? String(body.patient_phone) : null,
    patient_gender: body.patient_gender ? String(body.patient_gender) : null,
    patient_date_of_birth: body.patient_date_of_birth ? String(body.patient_date_of_birth) : null,
    cancel_reason: null,
    idempotency_key: idempotencyKey,
    created_at: ts,
    updated_at: ts,
  };
}

function registerRoutes(app: FastifyInstance, repo: AdmissionRepo) {
  // GET /admissions — admission queue
  app.get<{ Querystring: Record<string, string | undefined> }>("/admissions", PUBLIC, async (req, reply) => {
    const q = req.query;
    const status = q.status?.trim() ? q.status.split(",").map((s) => s.trim()) : ["draft", "pending", "active"];
    const page = Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit ?? "20", 10) || 20));
    const result = await repo.list(req.tenantId, { status, admission_source: q.admission_source, admission_type: q.admission_type, facility_id: q.facility_id, intended_ward_code: q.intended_ward_code, q: q.q, page, limit });
    return reply.send({ ...result, data: result.data.map(toApi) });
  });

  // POST /admissions — create admission
  app.post("/admissions", PUBLIC, async (req, reply) => {
    const body = (req.body ?? SAMPLE_BODY) as Record<string, unknown>;
    for (const f of ["admission_source", "admission_type", "patient_id", "facility_id", "patient_uhid", "patient_full_name"]) {
      if (!body[f]) return bad(reply, `Missing ${f}`);
    }
    const key = (req.headers["idempotency-key"] as string | undefined)?.trim() || null;
    if (key) {
      const existing = await repo.getByIdempotencyKey(req.tenantId, key);
      if (existing) return reply.code(201).send(toApi(existing));
    }
    const created = await repo.insert(await newAdmission(repo, req.tenantId, body, key));
    return reply.code(201).send(toApi(created));
  });

  // GET /admissions/:id — get admission by id
  app.get<{ Params: { admissionId: string } }>("/admissions/:admissionId", PUBLIC, async (req, reply) => {
    const row = await repo.getById(req.tenantId, req.params.admissionId);
    return row ? reply.send(toApi(row)) : notFound(reply);
  });

  // PATCH /admissions/:id — update admission
  app.patch<{ Params: { admissionId: string }; Body: Partial<Admission> }>("/admissions/:admissionId", PUBLIC, async (req, reply) => {
    const row = await repo.getById(req.tenantId, req.params.admissionId);
    if (!row) return notFound(reply);
    if (!["draft", "pending", "active"].includes(row.status)) return conflict(reply, "Cannot edit in current status");
    const patch = { ...req.body } as Partial<Admission>;
    if (typeof patch.deposit_amount === "number") patch.deposit_amount = String(patch.deposit_amount);
    const updated = await repo.update(req.tenantId, req.params.admissionId, patch);
    return reply.send(toApi(updated!));
  });
}

export function createRouter(options: IpdRouterOptions) {
  return fp(async (app: FastifyInstance) => {
    registerRoutes(app, createAdmissionRepo(options.db, options.useMock === true));
  }, { fastify: "5.x", name: "@hims/ipd" });
}
