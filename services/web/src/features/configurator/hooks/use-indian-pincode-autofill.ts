import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { INDIAN_STATE_OPTIONS } from '@/features/configurator/create-tenant-wizard-schema';
import {
  fetchIndianPincodePostOffices,
  mapPostOfficeToAddressFields,
  sanitizeIndianPincodeInput,
  type IndianPostOffice,
} from '@/lib/india-postal-pincode';

export type IndianPincodeAutofillFields = {
  locality: string;
  block: string;
  district: string;
  state: string;
};

type UseIndianPincodeAutofillOptions = {
  pinCode: string;
  initialPinCode?: string;
  onAutofill: (fields: IndianPincodeAutofillFields) => void;
  onClearAutofill?: () => void;
};

export function useIndianPincodeAutofill({
  pinCode,
  initialPinCode = '',
  onAutofill,
  onClearAutofill,
}: UseIndianPincodeAutofillOptions) {
  const normalizedPin = sanitizeIndianPincodeInput(pinCode);
  const initialPin = sanitizeIndianPincodeInput(initialPinCode);
  const lastAppliedPinRef = useRef('');
  const pinFieldRef = useRef<HTMLDivElement>(null);
  const [dismissedSuggestionsPin, setDismissedSuggestionsPin] = useState('');
  const pinEdited = normalizedPin !== initialPin;

  const pincodeQuery = useQuery({
    queryKey: ['indian-pincode', normalizedPin],
    queryFn: () => fetchIndianPincodePostOffices(normalizedPin),
    enabled: pinEdited && normalizedPin.length === 6,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const applyPostOffice = useCallback(
    (postOffice: IndianPostOffice) => {
      onAutofill(mapPostOfficeToAddressFields(postOffice, INDIAN_STATE_OPTIONS));
    },
    [onAutofill],
  );

  useEffect(() => {
    if (normalizedPin.length === 6) return;
    if (!lastAppliedPinRef.current) return;
    lastAppliedPinRef.current = '';
    setDismissedSuggestionsPin('');
    onClearAutofill?.();
  }, [normalizedPin, onClearAutofill]);

  useEffect(() => {
    if (normalizedPin.length !== 6) {
      setDismissedSuggestionsPin('');
    }
  }, [normalizedPin]);

  useEffect(() => {
    if (!pinEdited || normalizedPin.length !== 6) return;
    if (pincodeQuery.isError) {
      toast.error('Failed to fetch address for this PIN code');
      return;
    }
    if (!pincodeQuery.isSuccess) return;

    const offices = pincodeQuery.data;
    if (offices.length === 0) {
      toast.warning('No post offices found for this PIN code');
      return;
    }

    if (offices.length === 1 && lastAppliedPinRef.current !== normalizedPin) {
      lastAppliedPinRef.current = normalizedPin;
      applyPostOffice(offices[0]!);
    }
  }, [
    applyPostOffice,
    normalizedPin,
    pinEdited,
    pincodeQuery.data,
    pincodeQuery.isError,
    pincodeQuery.isSuccess,
  ]);

  const postOffices = pincodeQuery.data ?? [];
  const showPostOfficeSuggestions =
    pinEdited &&
    normalizedPin.length === 6 &&
    postOffices.length > 1 &&
    lastAppliedPinRef.current !== normalizedPin &&
    dismissedSuggestionsPin !== normalizedPin &&
    pincodeQuery.isSuccess;

  const handlePinChange = (raw: string) => {
    const nextPin = sanitizeIndianPincodeInput(raw);
    if (nextPin !== normalizedPin) {
      lastAppliedPinRef.current = '';
      setDismissedSuggestionsPin('');
    }
    return nextPin;
  };

  const handlePinFocus = () => {
    if (normalizedPin.length === 6 && dismissedSuggestionsPin === normalizedPin) {
      setDismissedSuggestionsPin('');
    }
  };

  const handlePostOfficeSelect = (office: IndianPostOffice) => {
    lastAppliedPinRef.current = normalizedPin;
    applyPostOffice(office);
    setDismissedSuggestionsPin('');
  };

  useEffect(() => {
    if (!showPostOfficeSuggestions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!pinFieldRef.current?.contains(event.target as Node)) {
        setDismissedSuggestionsPin(normalizedPin);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [normalizedPin, showPostOfficeSuggestions]);

  return {
    normalizedPin,
    pinFieldRef,
    isFetching: pincodeQuery.isFetching,
    showPostOfficeSuggestions,
    postOffices,
    handlePinChange,
    handlePinFocus,
    handlePostOfficeSelect,
  };
}
