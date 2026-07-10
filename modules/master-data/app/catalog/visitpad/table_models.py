"""Resolve Visitpad ORM classes for the current :class:`~app.core.catalog_scope.CatalogScope`."""

from __future__ import annotations

from app.core.catalog_scope import CatalogScope
from app.models.visitpad.allergen import VisitpadAllergenPublicModel, VisitpadAllergenTenantModel
from app.models.visitpad.allergy_reaction import (
    VisitpadAllergyReactionPublicModel,
    VisitpadAllergyReactionTenantModel,
)
from app.models.visitpad.chief_complaint import (
    VisitpadChiefComplaintPublicModel,
    VisitpadChiefComplaintTenantModel,
)
from app.models.visitpad.chronic_illness import (
    VisitpadChronicIllnessPublicModel,
    VisitpadChronicIllnessTenantModel,
)
from app.models.visitpad.conversion import (
    VisitpadUnitConversionPublicModel,
    VisitpadUnitConversionTenantModel,
)
from app.models.visitpad.diagnosis import VisitpadDiagnosisPublicModel, VisitpadDiagnosisTenantModel
from app.models.visitpad.manufacturer import (
    VisitpadManufacturerPublicModel,
    VisitpadManufacturerTenantModel,
)
from app.models.visitpad.medicine import VisitpadMedicinePublicModel, VisitpadMedicineTenantModel
from app.models.visitpad.procedure import VisitpadProcedurePublicModel, VisitpadProcedureTenantModel
from app.models.visitpad.rx_column import VisitpadRxColumnPublicModel, VisitpadRxColumnTenantModel
from app.models.visitpad.unit import VisitpadUnitPublicModel, VisitpadUnitTenantModel
from app.models.visitpad.vaccine import VisitpadVaccinePublicModel, VisitpadVaccineTenantModel
from app.models.visitpad.vital import VisitpadVitalPublicModel, VisitpadVitalTenantModel


def visitpad_unit_model(scope: CatalogScope):
    return VisitpadUnitTenantModel if scope.is_tenant else VisitpadUnitPublicModel


def visitpad_unit_conversion_model(scope: CatalogScope):
    return (
        VisitpadUnitConversionTenantModel
        if scope.is_tenant
        else VisitpadUnitConversionPublicModel
    )


def visitpad_medicine_model(scope: CatalogScope):
    return VisitpadMedicineTenantModel if scope.is_tenant else VisitpadMedicinePublicModel


def visitpad_vital_model(scope: CatalogScope):
    return VisitpadVitalTenantModel if scope.is_tenant else VisitpadVitalPublicModel


def visitpad_allergen_model(scope: CatalogScope):
    return VisitpadAllergenTenantModel if scope.is_tenant else VisitpadAllergenPublicModel


def visitpad_allergy_reaction_model(scope: CatalogScope):
    return (
        VisitpadAllergyReactionTenantModel
        if scope.is_tenant
        else VisitpadAllergyReactionPublicModel
    )


def visitpad_chief_complaint_model(scope: CatalogScope):
    return (
        VisitpadChiefComplaintTenantModel
        if scope.is_tenant
        else VisitpadChiefComplaintPublicModel
    )


def visitpad_diagnosis_model(scope: CatalogScope):
    return VisitpadDiagnosisTenantModel if scope.is_tenant else VisitpadDiagnosisPublicModel


def visitpad_chronic_illness_model(scope: CatalogScope):
    return (
        VisitpadChronicIllnessTenantModel
        if scope.is_tenant
        else VisitpadChronicIllnessPublicModel
    )


def visitpad_procedure_model(scope: CatalogScope):
    return VisitpadProcedureTenantModel if scope.is_tenant else VisitpadProcedurePublicModel


def visitpad_rx_column_model(scope: CatalogScope):
    return VisitpadRxColumnTenantModel if scope.is_tenant else VisitpadRxColumnPublicModel


def visitpad_vaccine_model(scope: CatalogScope):
    return VisitpadVaccineTenantModel if scope.is_tenant else VisitpadVaccinePublicModel


def visitpad_manufacturer_model(scope: CatalogScope):
    return VisitpadManufacturerTenantModel if scope.is_tenant else VisitpadManufacturerPublicModel
