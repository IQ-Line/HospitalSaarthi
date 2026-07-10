/**
 * @deprecated Obsolete under the bounded operator model. The platform operator no longer holds any
 * capabilities — its authority is the `scope:platform` membership (`user_management.platform_admins`),
 * which the PDP allows additively on platform-provisioning surfaces. This empty list is retained
 * only so any lingering importer keeps compiling; it grants nothing.
 */
export const PLATFORM_OPERATOR_CAPABILITY_KEYS = [] as const;
