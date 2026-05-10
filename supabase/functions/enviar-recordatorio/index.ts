import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
    const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar header secreto
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        // Fecha de mañana en Argentina (UTC-3)
        const ahora = new Date();
        const manana = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
        const mananaStr = new Date(manana.getTime() - 3 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: turnos, error } = await db
            .from("aareservas")
            .select("nombre_cliente, email_cliente, fecha_reserva, hora_reserva, servicio, modalidad")
            .eq("fecha_reserva", mananaStr)
            .eq("estado", "Confirmado")
            .not("email_cliente", "is", null);

        if (error) throw error;

        if (!turnos || turnos.length === 0) {
            return new Response(
                JSON.stringify({ message: "Sin turnos para mañana.", enviados: 0 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        let enviados = 0;

        for (const turno of turnos) {
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
                    html: `
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
            </div>
          `,
                }),
            });

            if (res.ok) enviados++;
        }

        return new Response(
            JSON.stringify({ message: `Recordatorios enviados: ${enviados}`, enviados }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
