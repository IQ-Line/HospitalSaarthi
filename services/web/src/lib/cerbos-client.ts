import { HTTP } from '@cerbos/http';

const CERBOS_URL = import.meta.env.VITE_CERBOS_URL ?? 'http://localhost:3592';

export const cerbosClient = new HTTP(CERBOS_URL);
