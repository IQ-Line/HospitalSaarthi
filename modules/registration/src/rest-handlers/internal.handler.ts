import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RegistrationRecord } from "../domain/registration.types.js";
import type { RegistrationRepo } from "../ports.js";
import { uuidParam } from "./route-schemas.js";

const REGISTRATION_INTERNAL_KEY_HEADER = "x-registration-internal-key";

/** Service-to-service guard; skipped in dev when unset (mirrors configurator internal routes). */
function assertRegistrationInternalAccess(request: FastifyRequest): void {
  const expected = process.env["REGISTRATION_INTERNAL_API_KEY"]?.trim();
  if (!expected) {
    if (process.env["NODE_ENV"] === "production") {
      throw Object.assign(new Error("REGISTRATION_INTERNAL_API_KEY is required in production"), {
        statusCode: 503,
      });
    }
    return;
  }
  const provided = request.headers[REGISTRATION_INTERNAL_KEY_HEADER];
  if (typeof provided !== "string" || provided !== expected) {
    throw Object.assign(new Error("x-registration-internal-key required"), { statusCode: 403 });
  }
}

export type InternalHandlerDeps = {
  registrationRepo: RegistrationRepo;
};

type M2ProfileResponse = {
  abhaAddress: string;
  abhaNumber: string | null;
  patientName: string;
  gender: string;
  yearOfBirth: number;
  phoneNo: string | null;
};

function mapGender(gender: string | null | undefined): string {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m") return "M";
  if (g === "female" || g === "f") return "F";
  return "O";
}

function resolveYearOfBirth(row: RegistrationRecord): number | null {
  if (typeof row.patient_year_of_birth === "number" && row.patient_year_of_birth > 1900) {
    return row.patient_year_of_birth;
  }
  if (row.patient_date_of_birth) {
    const y = new Date(row.patient_date_of_birth).getUTCFullYear();
    if (!Number.isNaN(y) && y > 1900) return y;
  }
  return null;
}

function registrationToM2Profile(row: RegistrationRecord): M2ProfileResponse | null {
  const abhaAddress = row.patient_abha_address?.trim();
  const patientName = row.patient_full_name?.trim();
  if (!abhaAddress || !patientName) return null;

  const yearOfBirth = resolveYearOfBirth(row);
  if (yearOfBirth === null) return null;

  const phone = row.patient_phone_number?.trim();
  return {
    abhaAddress,
    abhaNumber: row.patient_abha_number?.trim() || null,
    patientName,
    gender: mapGender(row.patient_gender),
    yearOfBirth,
    phoneNo: phone?.replace(/^\+91/, "") || null,
  };
}

export function registerInternalHandlers(
  app: FastifyInstance,
  deps: InternalHandlerDeps,
): void {
  app.get<{ Params: { patientId: string } }>(
    "/internal/patients/:patientId/m2-profile",
    {
      schema: {
        params: {
          type: "object",
          required: ["patientId"],
          additionalProperties: false,
          properties: { patientId: uuidParam },
        },
      },
    },
    async (request, reply) => {
      try {
        assertRegistrationInternalAccess(request);
      } catch (e) {
        const statusCode =
          e && typeof e === "object" && "statusCode" in e && typeof e.statusCode === "number"
            ? e.statusCode
            : 403;
        return reply.code(statusCode).send({ error: e instanceof Error ? e.message : "Forbidden" });
      }

      const tenantId = request.tenantId;
      const { patientId } = request.params;
      const row = await deps.registrationRepo.findByPatientId(tenantId, patientId);
      if (!row) {
        return reply.code(404).send({ error: "registration_not_found" });
      }

      const profile = registrationToM2Profile(row);
      if (!profile) {
        return reply.code(404).send({ error: "abha_profile_incomplete" });
      }

      return reply.send(profile);
    },
  );
}
