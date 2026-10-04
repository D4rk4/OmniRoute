type JsonRecord = Record<string, unknown>;

export const REASONING_CONTROL_DETECTOR_VERSION = 1;
export const REASONING_CONTROL_DETECTION_SOURCE = "models.data.owned_by";

export const REASONING_CONTROL_DETECTED_BACKENDS = new Set(["vllm", "sglang", "llamacpp"]);

export type DetectedReasoningControl = {
  mode: "chat-template";
  backend: string;
  source: typeof REASONING_CONTROL_DETECTION_SOURCE;
  detectorVersion: typeof REASONING_CONTROL_DETECTOR_VERSION;
  observedAt: string;
  endpointFingerprint: string;
};

export function normalizeDetectedReasoningControl(
  value: unknown
): DetectedReasoningControl | undefined {
  const record =
    value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
  if (
    record?.mode !== "chat-template" ||
    typeof record.backend !== "string" ||
    !REASONING_CONTROL_DETECTED_BACKENDS.has(record.backend) ||
    record.source !== REASONING_CONTROL_DETECTION_SOURCE ||
    record.detectorVersion !== REASONING_CONTROL_DETECTOR_VERSION ||
    typeof record.observedAt !== "string" ||
    !record.observedAt ||
    typeof record.endpointFingerprint !== "string" ||
    !record.endpointFingerprint
  ) {
    return undefined;
  }
  return record as DetectedReasoningControl;
}
