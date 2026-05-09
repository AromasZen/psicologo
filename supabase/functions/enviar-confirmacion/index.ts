import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Constante fácil de cambiar por deployment
const BASE_URL = "https://prueba123xyz.online";

// Usamos el secret de la variable de entorno, o el fallback directo
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "re_djDCkNuL_FDesrqVDb7dWNxVYgXGYpMut";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    // Si el turno no tiene email_cliente, devolvemos 200 sin hacer nada (WhatsApp se encarga)
    if (!record || !record.email_cliente) {
      return new Response(JSON.stringify({ message: "Sin email_cliente, no se envía correo." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const confirmUrl = `${BASE_URL}/confirmar-turno.html?token=${record.confirmation_token}`;

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2C5282;">¡Hola ${record.nombre_cliente}!</h2>
        <p>Gracias por solicitar un turno con el Lic. Martín Rossi. Por favor, confirmá tu asistencia revisando los siguientes datos:</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 10px;"><strong>📅 Fecha:</strong> ${record.fecha_reserva}</li>
            <li style="margin-bottom: 10px;"><strong>⏰ Hora:</strong> ${record.hora_reserva}</li>
            <li style="margin-bottom: 10px;"><strong>🧠 Servicio:</strong> ${record.servicio}</li>
            <li style="margin-bottom: 10px;"><strong>📍 Modalidad:</strong> ${record.modalidad}</li>
          </ul>
        </div>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${confirmUrl}" style="background-color: #2C5282; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Confirmar mi turno</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">Si no solicitaste este turno, podés ignorar este correo de forma segura.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Turnos <onboarding@resend.dev>", // Cambiar por dominio propio verificado en Resend si lo hay
        to: [record.email_cliente],
        subject: "Confirmá tu turno - Lic. Martín Rossi",
        html: htmlContent
      })
    });

    if (res.ok) {
      return new Response(JSON.stringify({ message: "Email de confirmación enviado con éxito." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      const errorData = await res.text();
      console.error("Error desde Resend:", errorData);
      return new Response(JSON.stringify({ error: errorData }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

  } catch (error) {
    console.error("Error en la Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
