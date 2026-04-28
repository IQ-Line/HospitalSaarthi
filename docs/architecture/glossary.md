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

## Platform structure

These terms define what kind of thing something is in this architecture. They are used precisely in the HLDs and ADRs.

- **Functional area** — One of the ~38 items in the AIIMS EOI Annexure V (e.g., "Outpatient Management," "Blood Bank," "Birth Registration"). A functional area is a scope of hospital operations, not a deployment unit. One or more functional areas may be implemented by a single module.
- **Module (deployment unit)** — The unit of independent deployment. A self-contained library implementing one or more functional areas, deployable as a Kubernetes pod (service mode) or embedded in a shared process (embedded mode). Owns its own database schema. Follows the [module shape template](hld/03-module-shape-template.md).
- **Core module** — A module that is an upstream dependency for the operational plane. A module is core if patient-facing or administrative modules depend on it to function. The platform has four: User Management, EMPI, Configurator, Master & Tenant Data. If a core module is down, some category of operations cannot proceed.
- **Feature module** — A module in the operational plane that implements clinical, diagnostic, administrative, or academic functional areas. Feature modules depend on core modules. Feature modules are independently adoptable — a hospital may deploy any subset.
- **Platform infrastructure** — Always-deployed services that are not modules (they don't follow the module shape template) but are required for the platform to operate. Includes the **BFF** (entry point for the frontend) and the **Integration Hub** (entry point for external systems).
- **Organization** — A legal/administrative entity (hospital chain, medical college, government health authority) that owns one or more tenants. Identified by `org_id`.
- **Tenant** — An individual hospital or facility within an organization. The unit of data isolation, configuration, and authorization scoping. Identified by `iq_tenant_id`. Every data operation is scoped to a tenant.
- **Plane** — A logical grouping of modules by their role in the system. Four planes: Identity (who are you?), Control (how is the system configured?), Reference (what are the standard codes/catalogs?), Operational (the clinical/admin workflows). Planes clarify dependency direction, not deployment topology.
- **Service mode** — The primary deployment mode. Each module runs as its own Kubernetes pod with a Cerbos PDP sidecar, communicating with other modules via an external event bus.
- **Embedded mode** — An alternative deployment mode for lite deployments. Multiple module libraries run in a single process with in-process events and a shared Cerbos PDP. Same module code, different packaging.
- **Library-first design** — The principle that modules are implemented as libraries with injected adapters (Ports & Adapters pattern), enabling both service mode and embedded mode from the same codebase.

## System architecture

- **BFF** — Backend For Frontend. Platform infrastructure that serves as the entry point for the platform's own frontend. Performs JWT signature verification and request routing. Not a security boundary — modules verify tokens independently.
- **Integration Hub** — Platform infrastructure comprising the Inbound Gateway (external systems calling in) and Outbound Connector (platform calling external systems), sharing a control plane. The Inbound Gateway is to external systems what the BFF is to the frontend.
- **Inbound Gateway** — The Integration Hub component that receives requests from external systems (legacy HIS, partner hospitals, ABDM/NHA). Handles protocol translation (HL7v2, FHIR, proprietary), authentication, and routing.
- **Outbound Connector** — The Integration Hub component that sends data to external systems (ABDM registries, insurance providers, state reporting). Handles retry, circuit breaking, and credential management.
- **MFE** — Microfrontend.
- **PaaS / SaaS** — Platform-as-a-Service / Software-as-a-Service.
- **DPDP Act** — Digital Personal Data Protection Act (India, 2023). The applicable privacy regime for Indian deployments.
- **HIPAA** — Health Insurance Portability and Accountability Act (US). The applicable privacy regime for US deployments.

## Process

- **ADR** — Architecture Decision Record. A document capturing one architectural decision, its context, the alternatives considered, and the consequences.
- **MADR** — Markdown Architecture Decision Records. The format used in this repo.
- **HLD / LLD** — High-Level Design / Low-Level Design.
