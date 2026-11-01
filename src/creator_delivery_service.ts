import { createServer } from "node:http";
import { ZodError } from "zod";
import { deliveryRequestSchema, planCreatorDelivery } from "./creator_experiment.js";
import { InfraiError } from "./infrai_flags.js";

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method !== "POST" || request.url !== "/delivery-plan") {
    response.writeHead(404).end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = deliveryRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const plan = await planCreatorDelivery(input);
    response.writeHead(200).end(JSON.stringify(plan));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid_request" }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.code }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "service_error" }));
  }
});

server.listen(port, () => console.log(`Creator delivery planner listening on http://localhost:${port}`));
