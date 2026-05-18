import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import staticFiles from "@fastify/static";
import { registerDominionRoutes } from "./dominion/routes.js";
import { registerSplendorRoutes } from "./splendor/routes.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });
await fastify.register(websocket);

await registerDominionRoutes(fastify);
await registerSplendorRoutes(fastify);

const dominionDist = process.env.DOMINION_DIST;
const splendorDist = process.env.SPLENDOR_DIST;
const siteDist = process.env.SITE_DIST;

if (splendorDist) {
  fastify.get("/splendor", async (_req, reply) => {
    return reply.redirect("/splendor/", 301);
  });

  await fastify.register(
    async function splendorApp(scope) {
      await scope.register(staticFiles, {
        root: splendorDist,
        prefix: "/",
      });
      scope.setNotFoundHandler(async (_req, reply) => {
        return reply.sendFile("index.html");
      });
    },
    { prefix: "/splendor" },
  );
}

if (dominionDist) {
  fastify.get("/dominion", async (_req, reply) => {
    return reply.redirect("/dominion/", 301);
  });

  await fastify.register(
    async function dominionApp(dominionScope) {
      await dominionScope.register(staticFiles, {
        root: dominionDist,
        prefix: "/",
      });
      dominionScope.setNotFoundHandler(async (_req, reply) => {
        return reply.sendFile("index.html");
      });
    },
    { prefix: "/dominion" },
  );
}

if (siteDist) {
  await fastify.register(staticFiles, {
    root: siteDist,
    prefix: "/",
  });
}

const port = Number(process.env.PORT ?? 3333);
await fastify.listen({ port, host: "0.0.0.0" });
