/**
 * Drizzle implementation of `AbdmSessionsPort`.
 *
 * TODO: implement using `@hims/ts-sdk-db`'s `DbInstance`. Pattern to mirror
 * is `modules/empi/src/data-access/patient.repo.ts` — constructor takes
 * `db`, methods are async and tenant-scoped via the composite PK.
 *
 * `patch()` must MERGE into `context` (jsonb) rather than replace; use a
 * raw `sql` fragment with `context || ${newContext}` or compute the merge
 * in JS and write the full object back.
 */

export {};
