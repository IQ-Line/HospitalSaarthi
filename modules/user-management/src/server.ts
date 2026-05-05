import Fastify from "fastify";
import { registerUserManagementRoutes } from "./router.js";

const app = Fastify();

registerUserManagementRoutes(app);

console.log("Starting User Management…");
await app.listen({ port: 3000 });
console.log("User Management running on http://localhost:3000");
