import Fastify from "fastify";
import { registerUserManagementRoutes } from "./router.js";

const fastify = Fastify();

registerUserManagementRoutes(fastify);

await fastify.listen({ port: 3000 });
console.log("Server running on http://localhost:3000");
