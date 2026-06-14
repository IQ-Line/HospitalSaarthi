import type { FieldErrors, FieldPath, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Field, FieldContent, FieldError } from '@pulse/ui/field';
import {
  IndianPincodeAddressFields,
  type IndianPincodeAddressValues,
} from '@/features/configurator/components/indian-pincode-address-fields';

type AddressPincodeFieldValues = {
  locality?: string;
  block?: string;
  district: string;
  state: string;
  pinCode: string;
};

type ConfiguratorAddressPincodeFieldsProps<T extends AddressPincodeFieldValues> = {
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  idPrefix: string;
  initialPinCode?: string;
};

export function ConfiguratorAddressPincodeFields<T extends AddressPincodeFieldValues>({
  errors,
  setValue,
  watch,
  idPrefix,
  initialPinCode = '',
}: ConfiguratorAddressPincodeFieldsProps<T>) {
  const values: IndianPincodeAddressValues = {
    pinCode: String(watch('pinCode' as FieldPath<T>) ?? ''),
    locality: String(watch('locality' as FieldPath<T>) ?? ''),
    block: String(watch('block' as FieldPath<T>) ?? ''),
    district: String(watch('district' as FieldPath<T>) ?? ''),
    state: String(watch('state' as FieldPath<T>) ?? ''),
  };

  const onFieldChange = <K extends keyof IndianPincodeAddressValues>(
    field: K,
    value: IndianPincodeAddressValues[K],
  ) => {
    setValue(field as FieldPath<T>, value as never, {
      shouldDirty: true,
      shouldValidate: field === 'district' || field === 'state' || field === 'pinCode',
    });
  };

  return (
    <>
      <IndianPincodeAddressFields
        idPrefix={idPrefix}
        values={values}
        initialPinCode={initialPinCode}
        onFieldChange={onFieldChange}
        pinRequired
        districtRequired
        districtLabel="District"
      />
      {errors.pinCode || errors.district || errors.state ? (
        <Field className="md:col-span-2">
          <FieldContent className="gap-1">
            {errors.pinCode ? <FieldError errors={[errors.pinCode as never]} /> : null}
            {errors.district ? <FieldError errors={[errors.district as never]} /> : null}
            {errors.state ? <FieldError errors={[errors.state as never]} /> : null}
          </FieldContent>
        </Field>
      ) : null}
    </>
  );
}
