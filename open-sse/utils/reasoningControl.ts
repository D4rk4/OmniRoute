import { createHash } from "node:crypto";
import {
  REASONING_CONTROL_DETECTED_BACKENDS,
  REASONING_CONTROL_DETECTION_SOURCE,
  REASONING_CONTROL_DETECTOR_VERSION,
  normalizeDetectedReasoningControl,
  type DetectedReasoningControl,
} from "@/shared/reasoning/reasoningControl.ts";

export {
  REASONING_CONTROL_DETECTION_SOURCE,
  REASONING_CONTROL_DETECTOR_VERSION,
  normalizeDetectedReasoningControl,
  type DetectedReasoningControl,
} from "@/shared/reasoning/reasoningControl.ts";

type JsonRecord = Record<string, unknown>;

function toRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

export function getReasoningControlEndpointFingerprint(
  providerSpecificData: unknown
): string | null {
  const data = toRecord(providerSpecificData);
  const rawBaseUrl = typeof data?.baseUrl === "string" ? data.baseUrl.trim() : "";
  const apiType =
    typeof data?.apiType === "string" && data.apiType.trim()
      ? data.apiType.trim().toLowerCase()
      : "chat";
  if (!rawBaseUrl || apiType !== "chat") return null;

  let baseUrl: string;
  try {
    const parsed = new URL(rawBaseUrl);
    parsed.hash = "";
    baseUrl = parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
  const chatPath = typeof data?.chatPath === "string" ? data.chatPath.trim() : "";
  return createHash("sha256")
    .update(JSON.stringify({ apiType, baseUrl, chatPath }))
    .digest("hex")
    .slice(0, 24);
}

export function detectReasoningControl(
  modelsPayload: unknown,
  providerSpecificData: unknown,
  observedAt = new Date().toISOString()
): DetectedReasoningControl | null {
  const payload = toRecord(modelsPayload);
  const rows = payload?.data;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10_000) return null;

  const owners: string[] = [];
  for (const row of rows) {
    const record = toRecord(row);
    const owner = typeof record?.owned_by === "string" ? record.owned_by.trim().toLowerCase() : "";
    if (!owner) return null;
    owners.push(owner);
  }

  const backend = owners[0];
  if (
    !REASONING_CONTROL_DETECTED_BACKENDS.has(backend) ||
    owners.some((owner) => owner !== backend)
  )
    return null;
  const endpointFingerprint = getReasoningControlEndpointFingerprint(providerSpecificData);
  if (!endpointFingerprint) return null;

  return {
    mode: "chat-template",
    backend,
    source: REASONING_CONTROL_DETECTION_SOURCE,
    detectorVersion: REASONING_CONTROL_DETECTOR_VERSION,
    observedAt,
    endpointFingerprint,
  };
}

export function resolveReasoningControl(providerSpecificData: unknown): "chat-template" | "openai" {
  const data = toRecord(providerSpecificData);
  if (data?.reasoningControl === "chat-template") return "chat-template";
  if (data?.reasoningControl === "openai") return "openai";

  const detected = normalizeDetectedReasoningControl(data?.detectedReasoningControl);
  const currentFingerprint = getReasoningControlEndpointFingerprint(data);
  return detected && detected.endpointFingerprint === currentFingerprint
    ? "chat-template"
    : "openai";
}
