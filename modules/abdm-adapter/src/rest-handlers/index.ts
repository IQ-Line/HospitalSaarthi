/**
 * REST handlers barrel for abdm-adapter.
 *
 * Handlers are Fastify route registrations. They:
 *   - validate input (Zod or AJV schema)
 *   - delegate to a use-case function with `deps` passed in
 *   - shape the HTTP response (status code, headers)
 *
 * No business logic in handlers — they are HTTP-adapter glue only.
 * Subfolders mirror milestones; the M1 set is what unblocks the first sprint.
 */

export {};
