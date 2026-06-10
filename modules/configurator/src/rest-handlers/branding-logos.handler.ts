import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { ConfiguratorError } from "../errors.js";
import { getRequestAuthContext } from "../http/request-auth-context.js";
import { assertPlatformSuperAdmin } from "../http/request-auth-context.js";
import { assertAllowedBrandingStorageKey } from "../lib/logo-upload-validation.js";
import { downloadBrandingLogoBytes } from "../lib/azure-blob-storage.js";
import { uploadBrandingLogo } from "../use-cases/upload-branding-logo.js";

async function readMultipartFile(file: MultipartFile): Promise<{
  bytes: Buffer;
  filename: string;
  mimeType: string;
}> {
  const chunks: Buffer[] = [];
  for await (const chunk of file.file) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    bytes: Buffer.concat(chunks),
    filename: file.filename,
    mimeType: file.mimetype,
  };
}

function readSlugFromFields(fields: MultipartFile["fields"]): string {
  const slugPart = fields["slug"];
  if (!slugPart) {
    return "";
  }
  const parts = Array.isArray(slugPart) ? slugPart : [slugPart];
  for (const part of parts) {
    if (part.type === "field") {
      const value = String(part.value ?? "").trim();
      if (value) {
        return value;
      }
    }
  }
  return "";
}

function assertAuthenticatedConfiguratorOperator(request: Parameters<typeof getRequestAuthContext>[0]): void {
  const { roles, userId } = getRequestAuthContext(request);
  if (roles.length === 0 && !userId) {
    throw new ConfiguratorError(
      403,
      "authentication is required for branding logo upload",
      "FORBIDDEN",
    );
  }
}

export function registerBrandingLogosHandler(app: FastifyInstance): void {
  app.post("/branding-logos/organization", async (request, reply) => {
    assertPlatformSuperAdmin(request);
    const part = await request.file();
    if (!part) {
      throw new ConfiguratorError(400, "file is required");
    }

    const { bytes, filename, mimeType } = await readMultipartFile(part);
    const slug = readSlugFromFields(part.fields);
    if (slug.length < 3) {
      throw new ConfiguratorError(400, "slug must be at least 3 characters");
    }

    const result = await uploadBrandingLogo({
      scope: "organization",
      slug,
      fileBytes: bytes,
      originalFileName: filename,
      mimeType,
    });
    return reply.code(201).send(result);
  });

  app.post("/branding-logos/tenant", async (request, reply) => {
    assertAuthenticatedConfiguratorOperator(request);
    const part = await request.file();
    if (!part) {
      throw new ConfiguratorError(400, "file is required");
    }

    const { bytes, filename, mimeType } = await readMultipartFile(part);
    const slug = readSlugFromFields(part.fields);
    if (slug.length < 3) {
      throw new ConfiguratorError(400, "slug must be at least 3 characters");
    }

    const result = await uploadBrandingLogo({
      scope: "tenant",
      slug,
      fileBytes: bytes,
      originalFileName: filename,
      mimeType,
    });
    return reply.code(201).send(result);
  });

  app.get<{ Querystring: { storage_key?: string } }>(
    "/branding-logos/download",
    async (request, reply) => {
      const storageKey = request.query.storage_key?.trim() ?? "";
      if (!storageKey) {
        throw new ConfiguratorError(400, "storage_key is required");
      }

      try {
        assertAllowedBrandingStorageKey(storageKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid storage key";
        throw new ConfiguratorError(400, message);
      }

      try {
        const { bytes, contentType } = await downloadBrandingLogoBytes(storageKey);
        return reply
          .header("Content-Type", contentType)
          .header("Cache-Control", "private, max-age=300")
          .send(bytes);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to download branding logo";
        throw new ConfiguratorError(503, message, "STORAGE_UNAVAILABLE");
      }
    },
  );
}
