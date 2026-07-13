import { describe, expect, it } from "vitest";
import {
  computeOpdDispenseFulfillmentStatus,
  computeWalkInDispenseFulfillmentStatus,
} from "./dispense-completion.js";

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

  it("marks OPD dispense issued when line qty is complete even if other Rx medicines exist", () => {
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
    ).toBe("issued");
  });

  it("marks OPD dispense issued when prescribed qty is met", () => {
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

  it("marks OPD dispense issued for substitute formulary id when qty is complete", () => {
    expect(
      computeOpdDispenseFulfillmentStatus(
        [
          {
            line_no: 1,
            medicine_id: "rx-visitpad-med",
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
            medicine_id: "inventory-formulary-med",
            medicine_display_name: "Crocin 650",
            prescribed_quantity: "10",
            quantity_dispensed: "10",
            unit_amount: "12",
          },
        ],
        1,
      ),
    ).toBe("issued");
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
            quantity_dispensed: "5",
            unit_amount: "100",
          },
        ],
      ),
    ).toBe("issued");
  });

  it("marks walk-in dispense issued when line qty meets or exceeds prescribed", () => {
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
