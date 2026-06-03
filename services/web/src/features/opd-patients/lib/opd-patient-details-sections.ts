import type { DetailViewLayoutConfig } from '@/components/detail-view';
import type { OpdPatientDetails } from '../types';

export const OPD_PATIENT_DETAILS_LAYOUT: DetailViewLayoutConfig<OpdPatientDetails> = {
  left: [
    {
      title: 'Basic Information',
      fields: [
        { label: 'First Name', getValue: (d) => d.firstName },
        { label: 'Middle Name', getValue: (d) => d.middleName },
        { label: 'Last Name', getValue: (d) => d.lastName },
        { label: 'UHID', getValue: (d) => d.uhid },
        { label: 'Date of Birth', getValue: (d) => d.dateOfBirth },
        { label: 'Age', getValue: (d) => d.ageDisplay },
        { label: 'Gender', getValue: (d) => d.gender },
        { label: 'ABHA Number', getValue: (d) => d.abhaNumber, highlight: true },
        { label: 'ABHA Address', getValue: (d) => d.abhaAddress, highlight: true },
      ],
    },
    {
      title: 'Contact Information',
      fields: [{ label: 'Phone Number', getValue: (d) => d.phoneNumber }],
    },
  ],
  right: [
    {
      title: 'Address',
      fields: [
        { label: 'Street Address', getValue: (d) => d.streetAddress },
        { label: 'District', getValue: (d) => d.district },
        { label: 'State', getValue: (d) => d.state },
        { label: 'PIN Code', getValue: (d) => d.pinCode },
      ],
    },
    {
      title: 'Registration Information',
      fields: [
        { label: 'Visit Count', getValue: (d) => String(d.visitCount) },
        { label: 'Last Updated', getValue: (d) => d.lastUpdated },
      ],
    },
  ],
};
