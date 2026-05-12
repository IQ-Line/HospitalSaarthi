"""Resolve Visitpad ORM classes for the current :class:`~app.core.catalog_scope.CatalogScope`."""

from __future__ import annotations

from app.core.catalog_scope import CatalogScope
from app.models.visitpad_allergen import VisitpadAllergenPublicModel, VisitpadAllergenTenantModel
from app.models.visitpad_allergy_reaction import (
    VisitpadAllergyReactionPublicModel,
    VisitpadAllergyReactionTenantModel,
)
from app.models.visitpad_chief_complaint import (
    VisitpadChiefComplaintPublicModel,
    VisitpadChiefComplaintTenantModel,
)
from app.models.visitpad_chronic_illness import (
    VisitpadChronicIllnessPublicModel,
    VisitpadChronicIllnessTenantModel,
)
from app.models.visitpad_diagnosis import VisitpadDiagnosisPublicModel, VisitpadDiagnosisTenantModel
from app.models.visitpad_medicine import VisitpadMedicinePublicModel, VisitpadMedicineTenantModel
from app.models.visitpad_procedure import VisitpadProcedurePublicModel, VisitpadProcedureTenantModel
from app.models.visitpad_rx_column import VisitpadRxColumnPublicModel, VisitpadRxColumnTenantModel
from app.models.visitpad_unit import VisitpadUnitPublicModel, VisitpadUnitTenantModel
from app.models.visitpad_unit_conversion import (
    VisitpadUnitConversionPublicModel,
    VisitpadUnitConversionTenantModel,
)
from app.models.visitpad_vital import VisitpadVitalPublicModel, VisitpadVitalTenantModel


def visitpad_unit_model(scope: CatalogScope):
    return VisitpadUnitTenantModel if scope.is_tenant else VisitpadUnitPublicModel


def visitpad_unit_conversion_model(scope: CatalogScope):
    return VisitpadUnitConversionTenantModel if scope.is_tenant else VisitpadUnitConversionPublicModel


def visitpad_medicine_model(scope: CatalogScope):
    return VisitpadMedicineTenantModel if scope.is_tenant else VisitpadMedicinePublicModel


def visitpad_vital_model(scope: CatalogScope):
    return VisitpadVitalTenantModel if scope.is_tenant else VisitpadVitalPublicModel


def visitpad_allergen_model(scope: CatalogScope):
    return VisitpadAllergenTenantModel if scope.is_tenant else VisitpadAllergenPublicModel


def visitpad_allergy_reaction_model(scope: CatalogScope):
    return VisitpadAllergyReactionTenantModel if scope.is_tenant else VisitpadAllergyReactionPublicModel


def visitpad_chief_complaint_model(scope: CatalogScope):
    return VisitpadChiefComplaintTenantModel if scope.is_tenant else VisitpadChiefComplaintPublicModel


def visitpad_diagnosis_model(scope: CatalogScope):
    return VisitpadDiagnosisTenantModel if scope.is_tenant else VisitpadDiagnosisPublicModel


def visitpad_chronic_illness_model(scope: CatalogScope):
    return VisitpadChronicIllnessTenantModel if scope.is_tenant else VisitpadChronicIllnessPublicModel


def visitpad_procedure_model(scope: CatalogScope):
    return VisitpadProcedureTenantModel if scope.is_tenant else VisitpadProcedurePublicModel


def visitpad_rx_column_model(scope: CatalogScope):
    return VisitpadRxColumnTenantModel if scope.is_tenant else VisitpadRxColumnPublicModel
