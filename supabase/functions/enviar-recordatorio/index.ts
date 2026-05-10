import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    // Verificar header secreto
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Calcular fecha de mañana en Argentina (UTC-3)
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setUTCHours(manana.getUTCHours() + (-3 * -1)); // compensar UTC-3
    manana.setUTCDate(manana.getUTCDate() + 1);
    const mananaStr = manana.toISOString().split("T")[0];

    // Conectar a Supabase con service role
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar turnos de mañana confirmados con email
    const { data: turnos, error } = await db
        .from("aareservas")
        .select("*")
        .eq("fecha_reserva", mananaStr)
        .eq("estado", "Confirmado")
        .not("email_cliente", "is", null);

    if (error) {
        console.error("Error consultando turnos:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!turnos || turnos.length === 0) {
        return new Response(
            JSON.stringify({ message: "Sin turnos para mañana.", enviados: 0 }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    }

    let enviados = 0;

    for (const turno of turnos) {
        const htmlContent = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <h2 style="color:#2C5282;">⏰ Recordatorio de turno</h2>
        <p>Hola <strong>${turno.nombre_cliente}</strong>,</p>
        <p>Te recordamos que mañana tenés un turno agendado:</p>
        <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;">
          <p><strong>📅 Fecha:</strong> ${turno.fecha_reserva}</p>
          <p><strong>⏰ Hora:</strong> ${turno.hora_reserva}</p>
          <p><strong>🧠 Servicio:</strong> ${turno.servicio}</p>
          <p><strong>📍 Modalidad:</strong> ${turno.modalidad}</p>
        </div>
        <p>Si no podés asistir, por favor avisanos con anticipación.</p>
        <p style="margin-top:30px;font-size:12px;color:#666;">
          Este es un recordatorio automático, no respondas este correo.
        </p>
      </div>
    `;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Turnos <onboarding@resend.dev>",
                to: [turno.email_cliente],
                subject: "Recordatorio: Tu turno es mañana",
                html: htmlContent,
            }),
        });

        if (res.ok) {
            enviados++;
        } else {
            const err = await res.text();
            console.error(`Error enviando a ${turno.email_cliente}:`, err);
        }
    }

    return new Response(
        JSON.stringify({ message: `Recordatorios enviados: ${enviados}`, enviados }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );
});