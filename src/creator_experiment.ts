import { createHmac } from "node:crypto";
import { z } from "zod";
import { infrai } from "./infrai_flags.js";

export const deliveryRequestSchema = z.object({
  creatorId: z.string().min(1).max(128),
  assetId: z.string().min(1).max(128),
  subscriberUpdate: z.boolean(),
  contentKind: z.enum(["audio", "video", "ebook"]),
});

export type DeliveryRequest = z.infer<typeof deliveryRequestSchema>;

type ExperimentConfig = {
  experiment: string;
  allocationPercent: number;
  salt: string;
};

export type DeliveryPlan = {
  experiment: string;
  variant: "control" | "treatment";
  processing: "standard" | "priority";
  subscriberUpdate: "queued" | "skipped";
  assetDelivery: "signed-download-pending";
};

function parseConfig(value: unknown): ExperimentConfig {
  return z.object({
    experiment: z.string().min(1),
    allocationPercent: z.number().int().min(0).max(100),
    salt: z.string().min(16),
  }).parse(value);
}

export function assignVariant(
  creatorId: string,
  config: ExperimentConfig,
): "control" | "treatment" {
  const digest = createHmac("sha256", config.salt).update(creatorId).digest();
  const bucket = digest.readUInt32BE(0) % 10_000;
  return bucket < config.allocationPercent * 100 ? "treatment" : "control";
}

export async function planCreatorDelivery(input: DeliveryRequest): Promise<DeliveryPlan> {
  const flag = await infrai.flags.get("creator-delivery-ab");
  const config = parseConfig(flag.default_value);
  const variant = assignVariant(input.creatorId, config);

  return {
    experiment: config.experiment,
    variant,
    processing: variant === "treatment" ? "priority" : "standard",
    subscriberUpdate: input.subscriberUpdate ? "queued" : "skipped",
    assetDelivery: "signed-download-pending",
  };
}
