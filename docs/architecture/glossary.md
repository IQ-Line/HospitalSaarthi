# Glossary

Living document. First use of any acronym in any architecture document expands it; subsequent uses don't. Add entries as new terms appear.

## Identity and access

- **AuthN** — Authentication. Verifying *who* a principal is.
- **AuthZ** — Authorization. Verifying *what* a principal is allowed to do.
- **PEP** — Policy Enforcement Point. The component (typically middleware in a module) that intercepts a request, packages the principal/action/resource, and asks the PDP for a decision.
- **PDP** — Policy Decision Point. The component that evaluates policies and returns ALLOW/DENY. In this architecture, a Cerbos sidecar.
- **PIP** — Policy Information Point. A source of attributes the PDP needs (e.g., role memberships, department assignments). Often the module's own database.
- **PAP** — Policy Administration Point. Where policies are authored. For this architecture, a Git repository plus a CI pipeline that compiles and tests policies.
- **JWT** — JSON Web Token. The signed token format used for session credentials.
- **JWKS** — JSON Web Key Set. The public keys the IdP publishes so services can verify JWT signatures locally.
- **OIDC** — OpenID Connect. The standard authentication layer on top of OAuth 2.0.
- **SCIM** — System for Cross-domain Identity Management. The standard protocol for provisioning/deprovisioning users across federated systems.
- **JIT provisioning** — Just-In-Time provisioning. Creating a local user record on first successful federated login.
- **MFA** — Multi-Factor Authentication.
- **RBAC / ABAC** — Role-Based / Attribute-Based Access Control. Cerbos supports both; this architecture uses ABAC predominantly with role attributes.

## Healthcare and interop

- **HIMS** — Hospital Information Management System.
- **HIS** — Hospital Information System (often used interchangeably with HIMS; HIS sometimes refers to the legacy systems we integrate with).
- **EOI** — Expression of Interest. The procurement document (AIIMS in this case) that defines the scope.
- **EMPI / MPI** — Enterprise Master Patient Index / Master Patient Index. The service that owns canonical patient identity and resolves duplicates across sources.
- **MRN** — Medical Record Number. A hospital-local patient identifier.
- **FHIR** — Fast Healthcare Interoperability Resources. The HL7-published standard for healthcare data exchange. R4 is the current normative version targeted here.
- **HL7v2** — Health Level 7 version 2. The older pipe-delimited message standard, still dominant in lab/radiology integrations.
- **ICD** — International Classification of Diseases. WHO-published diagnosis codes.
- **LOINC** — Logical Observation Identifiers Names and Codes. Standard codes for lab tests and clinical observations.
- **SNOMED CT** — Standardized clinical terminology.
- **ABDM** — Ayushman Bharat Digital Mission. India's national digital health stack.
- **NDHM** — National Digital Health Mission (predecessor name; ABDM is the current branding).
- **NHA** — National Health Authority (the body operating ABDM).
- **ABHA** — Ayushman Bharat Health Account. India's national health ID for individuals.

## System architecture

- **BFF** — Backend For Frontend. A gateway tailored to a specific client (web, mobile).
- **MFE** — Microfrontend.
- **PaaS / SaaS** — Platform-as-a-Service / Software-as-a-Service.
- **DPDP Act** — Digital Personal Data Protection Act (India, 2023). The applicable privacy regime for Indian deployments.
- **HIPAA** — Health Insurance Portability and Accountability Act (US). The applicable privacy regime for US deployments.

## Process

- **ADR** — Architecture Decision Record. A document capturing one architectural decision, its context, the alternatives considered, and the consequences.
- **MADR** — Markdown Architecture Decision Records. The format used in this repo.
- **HLD / LLD** — High-Level Design / Low-Level Design.
