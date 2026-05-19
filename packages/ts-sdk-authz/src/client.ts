import { GRPC } from "@cerbos/grpc";
import type { AuthzPluginOptions } from "./types.js";

let instance: GRPC | null = null;

/** Cerbos gRPC client expects host:port; strip optional grpc:// prefix from env. */
export function normalizeCerbosGrpcUrl(url: string): string {
  return url.trim().replace(/^grpc:\/\//i, "");
}

export function getCerbosClient(options: AuthzPluginOptions): GRPC {
  if (!instance) {
    instance = new GRPC(normalizeCerbosGrpcUrl(options.cerbosUrl), {
      tls: false,
      ...(options.playgroundInstance && {
        playgroundInstance: options.playgroundInstance,
      }),
    });
  }
  return instance;
}

export function closeCerbosClient(): void {
  instance?.close();
  instance = null;
}
