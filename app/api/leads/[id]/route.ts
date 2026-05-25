import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase";
import { REJECTION_REASONS, snoozeDate } from "@/lib/utils";

type Body = {
  action?: "approve" | "snooze" | "reject" | "response";
  reason?: string;
  responseType?: "waiting" | "positive" | "negative" | "no_response";
  notes?: string;
  meetingScheduled?: boolean;
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado. Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;

  if (!body.action || !["approve", "snooze", "reject", "response"].includes(body.action)) {
    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  }

  if (body.action === "reject" && (!body.reason || !REJECTION_REASONS.includes(body.reason))) {
    return NextResponse.json({ error: "Motivo de rejeicao invalido." }, { status: 400 });
  }

  if (body.action === "response" && !body.responseType) {
    return NextResponse.json({ error: "Status de resposta invalido." }, { status: 400 });
  }

  const updates =
    body.action === "approve"
      ? [
          { status: "approved", snoozed_until: null },
          { status: "approved", rejection_reason: null, snoozed_until: null }
        ]
      : body.action === "snooze"
        ? [{ status: "snoozed", snoozed_until: snoozeDate(7) }]
        : body.action === "reject"
          ? [
              { status: "rejected", response_notes: body.reason, snoozed_until: null },
              { status: "rejected", rejection_reason: body.reason, snoozed_until: null }
            ]
          : [
              {
                response_status: body.responseType,
                response_notes: body.notes ?? null,
                meeting_scheduled: body.meetingScheduled ?? false
              },
              {
                response_type: body.responseType,
                objection: body.notes ?? null,
                meeting_scheduled: body.meetingScheduled ?? false
              }
            ];

  let lastError: string | null = null;

  for (const update of updates) {
    const { error } = await supabase.from("leads").update(update).eq("id", params.id);

    if (!error) {
      revalidatePath("/bandeja");
      revalidatePath("/enviados");
      return NextResponse.json({ ok: true });
    }

    lastError = error.message;
  }

  return NextResponse.json({ error: lastError ?? "Nao foi possivel salvar." }, { status: 500 });
}
