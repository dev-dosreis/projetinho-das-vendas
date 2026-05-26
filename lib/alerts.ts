import "server-only";

type PipelineAlertInput = {
  stage: string;
  message: string;
  domain?: string;
  error?: unknown;
};

export async function notifyPipelineFailure(input: PipelineAlertInput) {
  const payload = {
    text: `[lead-engine] Falha em ${input.stage}${input.domain ? ` (${input.domain})` : ""}: ${input.message}`,
    stage: input.stage,
    domain: input.domain,
    message: input.message,
    error: stringifyError(input.error),
    created_at: new Date().toISOString()
  };

  console.error(payload.text, payload.error ?? "");

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("[lead-engine] Falha ao enviar alerta", stringifyError(error));
  }
}

function stringifyError(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return String(error);
}
