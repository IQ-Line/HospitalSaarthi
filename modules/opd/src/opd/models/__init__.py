"""SQLAlchemy models for the OPD module."""

from opd.models.base import Base
from opd.models.prescription import Prescription
from opd.models.visit import Visit

__all__ = ["Base", "Visit", "Prescription"]
