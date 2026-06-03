"""SQLAlchemy models for the OPD module.

Re-export ``Base`` so Alembic's ``target_metadata`` discovery picks up every
table declared under ``opd.models``.
"""

from opd.models.base import Base
from opd.models.prescription import (  # noqa: F401 — register tables for Alembic
    PrescriptionAdvisedProcedureModel,
    PrescriptionCarePlanModel,
    PrescriptionChiefComplaintModel,
    PrescriptionDiagnosisModel,
    PrescriptionLegacyVitalsModel,
    PrescriptionMedicalHistoryAllergyModel,
    PrescriptionMedicalHistoryChronicIllnessModel,
    PrescriptionMedicalHistoryModel,
    PrescriptionMedicineModel,
    PrescriptionMedicineSubstitutionModel,
    PrescriptionModel,
    PrescriptionOrderedImagingModel,
    PrescriptionOrderedTestModel,
    PrescriptionPhysicalActivityExerciseTypeModel,
    PrescriptionPhysicalActivityModel,
    PrescriptionStatusHistoryModel,
    PrescriptionSymptomModel,
    PrescriptionVaccineRequiredModel,
    PrescriptionVitalObservationModel,
)
from opd.models.prescription_row import Prescription  # noqa: F401
from opd.models.registration_visit import RegistrationVisit  # noqa: F401
from opd.models.visit import Visit  # noqa: F401

__all__ = ["Base", "Prescription", "PrescriptionModel", "RegistrationVisit", "Visit"]
