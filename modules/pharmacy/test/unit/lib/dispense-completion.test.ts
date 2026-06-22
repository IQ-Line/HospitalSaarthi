import { describe, expect, it } from "vitest";
import {
  computeOpdDispenseFulfillmentStatus,
  computeWalkInDispenseFulfillmentStatus,
} from "../../../src/lib/dispense-completion.js";

describe("dispense-completion", () => {
  it("marks OPD dispense partial when dispensed qty is below prescribed", () => {
    expect(
      computeOpdDispenseFulfillmentStatus(
        [
          {
            line_no: 1,
            medicine_id: "med-1",
            name: "Paracetamol",
            strength: null,
            dosage: null,
            duration: null,
            frequency: null,
            quantity: "10",
            route: null,
          },
        ],
        [
          {
            medicine_id: "med-1",
            medicine_display_name: "Paracetamol",
            prescribed_quantity: "10",
            quantity_dispensed: "5",
            unit_amount: "10",
          },
        ],
      ),
    ).toBe("partial_issue");
  });

  it("marks OPD dispense partial when a dispensable medicine is missing", () => {
    expect(
      computeOpdDispenseFulfillmentStatus(
        [
          {
            line_no: 1,
            medicine_id: "med-1",
            name: "Tab A",
            strength: null,
            dosage: null,
            duration: null,
            frequency: null,
            quantity: "10",
            route: null,
          },
          {
            line_no: 2,
            medicine_id: "med-2",
            name: "Tab B",
            strength: null,
            dosage: null,
            duration: null,
            frequency: null,
            quantity: "5",
            route: null,
          },
        ],
        [
          {
            medicine_id: "med-1",
            medicine_display_name: "Tab A",
            prescribed_quantity: "10",
            quantity_dispensed: "10",
            unit_amount: "10",
          },
        ],
      ),
    ).toBe("partial_issue");
  });

  it("marks OPD dispense issued when all dispensable medicines are fully dispensed", () => {
    expect(
      computeOpdDispenseFulfillmentStatus(
        [
          {
            line_no: 1,
            medicine_id: "med-1",
            name: "Tab A",
            strength: null,
            dosage: null,
            duration: null,
            frequency: null,
            quantity: "10",
            route: null,
          },
        ],
        [
          {
            medicine_id: "med-1",
            medicine_display_name: "Tab A",
            prescribed_quantity: "10",
            quantity_dispensed: "10",
            unit_amount: "10",
          },
        ],
      ),
    ).toBe("issued");
  });

  it("marks OPD dispense partial when dispensable medicines are empty but Rx had lines", () => {
    expect(
      computeOpdDispenseFulfillmentStatus(
        [],
        [
          {
            medicine_id: "med-1",
            medicine_display_name: "Tab A",
            quantity_dispensed: "1",
            unit_amount: "10",
          },
        ],
        2,
      ),
    ).toBe("partial_issue");
  });

  it("marks OPD dispense issued when dispensed qty exceeds prescribed", () => {
    expect(
      computeOpdDispenseFulfillmentStatus(
        [
          {
            line_no: 1,
            medicine_id: "med-1",
            name: "Paracetamol",
            strength: null,
            dosage: null,
            duration: null,
            frequency: null,
            quantity: "4",
            route: null,
          },
        ],
        [
          {
            medicine_id: "med-1",
            medicine_display_name: "Paracetamol",
            prescribed_quantity: "4",
            quantity_dispensed: "4",
            unit_amount: "100",
          },
          {
            medicine_id: "med-1",
            medicine_display_name: "Paracetamol",
            prescribed_quantity: null,
            quantity_dispensed: "1",
            unit_amount: "100",
          },
        ],
      ),
    ).toBe("issued");
  });

  it("marks walk-in dispense issued when line qty exceeds prescribed", () => {
    expect(
      computeWalkInDispenseFulfillmentStatus([
        {
          medicine_id: "med-1",
          medicine_display_name: "Tab A",
          prescribed_quantity: "4",
          quantity_dispensed: "5",
          unit_amount: "10",
        },
      ]),
    ).toBe("issued");
  });

  it("marks walk-in dispense partial when line qty is short", () => {
    expect(
      computeWalkInDispenseFulfillmentStatus([
        {
          medicine_id: "med-1",
          medicine_display_name: "Tab A",
          prescribed_quantity: "6",
          quantity_dispensed: "4",
          unit_amount: "10",
        },
      ]),
    ).toBe("partial_issue");
  });
});
