import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase";
import { REJECTION_REASONS } from "@/lib/utils";

type Body = {
  action?: "approve" | "snooze" | "reject";
  reason?: string;
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

  if (!body.action || !["approve", "snooze", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  }

  if (body.action === "reject" && (!body.reason || !REJECTION_REASONS.includes(body.reason))) {
    return NextResponse.json({ error: "Motivo de rejeicao invalido." }, { status: 400 });
  }

  const update =
    body.action === "approve"
      ? { status: "approved", rejection_reason: null }
      : body.action === "snooze"
        ? { status: "snoozed" }
        : { status: "rejected", rejection_reason: body.reason };

  const { error } = await supabase.from("leads").update(update).eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/bandeja");
  return NextResponse.json({ ok: true });
}
