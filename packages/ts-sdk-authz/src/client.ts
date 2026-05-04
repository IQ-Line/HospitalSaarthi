import { GRPC } from "@cerbos/grpc";
import type { AuthzPluginOptions } from "./types.js";

let instance: GRPC | null = null;

export function getCerbosClient(options: AuthzPluginOptions): GRPC {
  if (!instance) {
    instance = new GRPC(options.cerbosUrl, {
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
