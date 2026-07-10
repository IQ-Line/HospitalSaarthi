// Vite injects `import.meta.env` at build time in the consuming app (services/web).
// This UI library is built by that Vite app but does not depend on Vite itself, so we
// declare the minimal subset it uses rather than pulling in `vite/client`.
interface ImportMetaEnv {
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
