import { describe, expect, it } from "vitest";
import {
  canEditClinicalNote,
  canFinalizeClinicalNote,
  type ClinicalNote,
} from "./clinical-note.js";

const baseNote = (): ClinicalNote => ({
  id: "n-1",
  iq_tenant_id: "t-1",
  episode_id: "e-1",
  note_type: "progress_note",
  author_id: "u-1",
  author_role: "consultant",
  author_specialty_code: "general_medicine",
  content: { structured: "test" },
  status: "draft",
  finalized_at: null,
  finalized_by: null,
  signed_at: null,
  signed_by: null,
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
});

describe("canEditClinicalNote", () => {
  it("allows author to edit draft", () => {
    expect(canEditClinicalNote(baseNote(), "u-1")).toBe(true);
  });

  it("denies non-author", () => {
    expect(canEditClinicalNote(baseNote(), "u-2")).toBe(false);
  });

  it("denies edit when finalized", () => {
    expect(canEditClinicalNote({ ...baseNote(), status: "finalized" }, "u-1")).toBe(false);
  });
});

describe("canFinalizeClinicalNote", () => {
  it("allows author to finalize draft", () => {
    expect(canFinalizeClinicalNote(baseNote(), "u-1")).toBe(true);
  });

  it("denies non-author", () => {
    expect(canFinalizeClinicalNote(baseNote(), "u-2")).toBe(false);
  });
});
