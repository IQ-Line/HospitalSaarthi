import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@pulse/utils"

// ─── Shared container + label ─────────────────────────────────────────────────
//
// The label sits on the top border of the container (like a <fieldset> legend).
// bg-background on the label "punches through" the border to create the inset
// effect. Override `labelClassName` if the control lives inside a non-background
// surface (e.g. a Card with bg-card).

interface InsetWrapperProps {
  label: string
  id: string
  labelClassName?: string
  containerClassName?: string
  hasError?: boolean
  disabled?: boolean
  children: React.ReactNode
}

function InsetWrapper({
  label,
  id,
  labelClassName,
  containerClassName,
  hasError,
  disabled,
  children,
}: InsetWrapperProps) {
  return (
    <div
      className={cn(
        "border-input relative rounded-lg border bg-transparent transition-colors",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        hasError &&
          "border-destructive ring-[3px] ring-destructive/20 dark:ring-destructive/40",
        disabled && "pointer-events-none opacity-50",
        containerClassName
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          "bg-background text-muted-foreground absolute left-3 top-0 -translate-y-1/2 select-none px-1 text-xs leading-none",
          labelClassName
        )}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── InsetInput ───────────────────────────────────────────────────────────────

interface InsetInputProps extends React.ComponentProps<"input"> {
  label: string
  labelClassName?: string
}

function InsetInput({
  label,
  labelClassName,
  className,
  id,
  "aria-invalid": ariaInvalid,
  disabled,
  ...props
}: InsetInputProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId

  return (
    <InsetWrapper
      label={label}
      id={inputId}
      labelClassName={labelClassName}
      hasError={!!ariaInvalid}
      disabled={disabled}
      containerClassName={className}
    >
      <input
        id={inputId}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        className="w-full min-w-0 bg-transparent px-3 pt-[0.4375rem] pb-[0.3125rem] text-sm outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
        {...props}
      />
    </InsetWrapper>
  )
}

// ─── InsetTextarea ────────────────────────────────────────────────────────────

interface InsetTextareaProps extends React.ComponentProps<"textarea"> {
  label: string
  labelClassName?: string
}

function InsetTextarea({
  label,
  labelClassName,
  className,
  id,
  "aria-invalid": ariaInvalid,
  disabled,
  ...props
}: InsetTextareaProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId

  return (
    <InsetWrapper
      label={label}
      id={inputId}
      labelClassName={labelClassName}
      hasError={!!ariaInvalid}
      disabled={disabled}
      containerClassName={className}
    >
      <textarea
        id={inputId}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        className="w-full min-w-0 resize-none bg-transparent px-3 pt-[0.4375rem] pb-[0.3125rem] text-sm outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
        {...props}
      />
    </InsetWrapper>
  )
}

// ─── InsetSelect ──────────────────────────────────────────────────────────────

interface InsetSelectProps extends React.ComponentProps<"select"> {
  label: string
  labelClassName?: string
}

function InsetSelect({
  label,
  labelClassName,
  className,
  id,
  "aria-invalid": ariaInvalid,
  disabled,
  children,
  ...props
}: InsetSelectProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId

  return (
    <InsetWrapper
      label={label}
      id={inputId}
      labelClassName={labelClassName}
      hasError={!!ariaInvalid}
      disabled={disabled}
      containerClassName={className}
    >
      <select
        id={inputId}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        className="w-full min-w-0 appearance-none bg-transparent pr-8 pl-3 pt-[0.4375rem] pb-[0.3125rem] text-sm outline-none disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2"
        aria-hidden
      />
    </InsetWrapper>
  )
}

export { InsetInput, InsetTextarea, InsetSelect }
