"""Pydantic payloads for inventory HSN/GST schedules."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class InventoryHsnGstResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    hsn_code: str
    effective_from: date
    cgst_pct: Decimal
    sgst_pct: Decimal
    igst_pct: Decimal
    supporting_document_url: str | None = None
    remarks: str | None = None
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class InventoryHsnGstListResponse(BaseModel):
    data: list[InventoryHsnGstResponse]
    total: int


class InventoryHsnGstSingleResponse(BaseModel):
    data: InventoryHsnGstResponse


def _validate_hsn_code(v: str) -> str:
    s = v.strip()
    if not s.isdigit() or not (4 <= len(s) <= 8):
        raise ValueError("HSN code must be 4–8 digits.")
    return s


def _validate_rates(cgst: Decimal, sgst: Decimal, igst: Decimal) -> None:
    if cgst + sgst != igst:
        raise ValueError("CGST + SGST must equal IGST.")


class InventoryHsnGstCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hsn_code: str = Field(min_length=4, max_length=8)
    effective_from: date
    cgst_pct: Decimal = Field(ge=0)
    sgst_pct: Decimal = Field(ge=0)
    igst_pct: Decimal = Field(ge=0)
    supporting_document_url: str | None = None
    remarks: str | None = Field(default=None, max_length=200)
    is_active: bool = True

    @field_validator("hsn_code")
    @classmethod
    def _hsn(cls, v: str) -> str:
        return _validate_hsn_code(v)

    @model_validator(mode="after")
    def _rates(self) -> InventoryHsnGstCreate:
        _validate_rates(self.cgst_pct, self.sgst_pct, self.igst_pct)
        return self


class InventoryHsnGstUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    effective_from: date | None = None
    cgst_pct: Decimal | None = Field(default=None, ge=0)
    sgst_pct: Decimal | None = Field(default=None, ge=0)
    igst_pct: Decimal | None = Field(default=None, ge=0)
    supporting_document_url: str | None = None
    remarks: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None
    is_deleted: bool | None = None

    @model_validator(mode="after")
    def _rates_together(self) -> InventoryHsnGstUpdate:
        rates = [self.cgst_pct, self.sgst_pct, self.igst_pct]
        if any(r is not None for r in rates) and not all(r is not None for r in rates):
            raise ValueError("cgst_pct, sgst_pct, and igst_pct must be updated together.")
        if all(r is not None for r in rates):
            _validate_rates(self.cgst_pct, self.sgst_pct, self.igst_pct)  # type: ignore[arg-type]
        return self
