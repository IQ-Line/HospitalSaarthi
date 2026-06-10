/** JSON Schema aligned with pdf-platform `opdSlipRequestSchema`. */

const pdfRenderOptionsSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    landscape: { type: "boolean" },
    format: { type: "string", enum: ["A4", "Letter"] },
    marginTop: { type: "string", maxLength: 32 },
    marginBottom: { type: "string", maxLength: 32 },
    marginLeft: { type: "string", maxLength: 32 },
    marginRight: { type: "string", maxLength: 32 },
  },
};

export const partnerOpdSlipRequestSchema = {
  type: "object" as const,
  additionalProperties: false,
  required: ["patientId", "visitId", "patient", "visit", "doctor", "facility"],
  properties: {
    patientId: { type: "string", minLength: 1 },
    visitId: { type: "string", minLength: 1 },
    doctorId: { type: "string", minLength: 1 },
    patient: {
      type: "object" as const,
      additionalProperties: false,
      required: ["name", "uhid"],
      properties: {
        name: { type: "string", minLength: 1 },
        uhid: { type: "string", minLength: 1 },
        phoneNumber: { type: "string" },
        dateOfBirth: { type: "string" },
        yearOfBirth: { type: "integer" },
        gender: { type: "string" },
        salutation: { type: "string" },
        abhaNumber: { type: "string" },
        abhaAddress: { type: "string" },
        address: { type: "string" },
      },
    },
    visit: {
      type: "object" as const,
      additionalProperties: false,
      required: ["createdAt"],
      properties: {
        visitNumber: { type: "string" },
        createdAt: { type: "string", minLength: 1 },
        visitType: { type: "string" },
        status: { type: "string" },
        departmentName: { type: "string" },
        roomNumber: { type: "string" },
        tokenNumber: { type: "integer" },
        fees: { type: "string" },
        visitValidTill: { type: "string" },
        consultationType: { type: "string" },
        priority: { type: "string" },
      },
    },
    doctor: {
      type: "object" as const,
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        qualification: { type: "string" },
        specialization: { type: "string" },
        hprId: { type: "string" },
        regNumber: { type: "string" },
        signature: { type: "string" },
      },
    },
    facility: {
      type: "object" as const,
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        address: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        facilityId: { type: "string" },
        logoUrl: { type: "string" },
        footerText: { type: "string" },
      },
    },
    smartParchaEnabled: { type: "boolean" },
    smartParchaPages: {
      type: "array",
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["pageNumber", "content"],
        properties: {
          pageNumber: { type: "integer", minimum: 1 },
          content: { type: "string", minLength: 1 },
        },
      },
    },
    showDoctorSignature: { type: "boolean" },
    options: pdfRenderOptionsSchema,
  },
};
