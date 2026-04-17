import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 30;

const resend = new Resend(process.env.RESEND_API_KEY);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatBytes = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
};

const buildSummaryHtml = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "<p>Sin resumen disponible.</p>";
  }

  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      ${items
        .map(
          (item) => `
            <tr>
              <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:700;color:#374151;width:38%;">${escapeHtml(item.label)}</td>
              <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#111827;">${escapeHtml(item.value)}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
};

const buildFilesHtml = (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return '<p style="margin:0;color:#6b7280;">Sin archivos adjuntos.</p>';
  }

  return `
    <ul style="margin:0;padding-left:18px;color:#111827;line-height:1.7;">
      ${files
        .map(
          (file) => `
            <li style="margin:0 0 8px;">
              <a href="${escapeHtml(file.downloadUrl || file.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.name)}</a>
              <span style="color:#6b7280;"> · ${escapeHtml(formatBytes(file.size))}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
};

export async function POST(request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json(
      { error: "Falta configurar RESEND_API_KEY en Vercel." },
      { status: 500 },
    );
  }

  if (!process.env.MAIL_TO || !process.env.MAIL_FROM) {
    return Response.json(
      { error: "Faltan MAIL_TO o MAIL_FROM en las variables de entorno." },
      { status: 500 },
    );
  }

  try {
    const payload = await request.json();
    const {
      leadType = "instalacion",
      name = "",
      phone = "",
      email = "",
      message = "",
      summaryItems = [],
      selectedOption = "",
      uploadedFiles = [],
    } = payload || {};

    const safeLeadType = leadType === "mantenimiento" ? "mantenimiento" : "instalacion";
    const leadTitle =
      safeLeadType === "mantenimiento"
        ? "Nueva solicitud de mantenimiento fotovoltaico"
        : "Nueva solicitud de evaluación solar";

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f4;padding:24px;color:#111827;">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:28px;">
          <div style="margin-bottom:20px;">
            <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#fff9d7;border:1px solid #ead675;color:#7a6411;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Lead web Sakiara</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.15;color:#1f2937;">${escapeHtml(leadTitle)}</h1>
            <p style="margin:10px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">Se recibió una nueva solicitud desde el cotizador web con los datos de contacto, resumen del proyecto y enlaces a los archivos enviados por el cliente.</p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:20px;">
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Nombre</div>
              <div style="margin-top:8px;font-size:17px;font-weight:700;color:#111827;">${escapeHtml(name || "-")}</div>
            </div>
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Teléfono</div>
              <div style="margin-top:8px;font-size:17px;font-weight:700;color:#111827;">${escapeHtml(phone || "-")}</div>
            </div>
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;grid-column:1 / -1;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Correo</div>
              <div style="margin-top:8px;font-size:17px;font-weight:700;color:#111827;">${escapeHtml(email || "-")}</div>
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 10px;font-size:18px;color:#1f2937;">Mensaje del cliente</h2>
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;color:#374151;line-height:1.75;white-space:pre-wrap;">${escapeHtml(message || "Sin mensaje adicional.")}</div>
          </div>

          <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 10px;font-size:18px;color:#1f2937;">Resumen de la solicitud</h2>
            ${buildSummaryHtml(summaryItems)}
          </div>

          <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 10px;font-size:18px;color:#1f2937;">Alternativa / resultado destacado</h2>
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#fffef5;color:#374151;">${escapeHtml(selectedOption || "No informado")}</div>
          </div>

          <div>
            <h2 style="margin:0 0 10px;font-size:18px;color:#1f2937;">Archivos enviados</h2>
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;">
              ${buildFilesHtml(uploadedFiles)}
            </div>
          </div>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `Sakiara Web <${process.env.MAIL_FROM}>`,
      to: [process.env.MAIL_TO],
      subject: `${leadTitle} · ${name || "Sin nombre"}`,
      html,
      text: [
        leadTitle,
        `Nombre: ${name || "-"}`,
        `Teléfono: ${phone || "-"}`,
        `Correo: ${email || "-"}`,
        "",
        "Resumen:",
        ...(summaryItems || []).map((item) => `${item.label}: ${item.value}`),
        "",
        `Mensaje: ${message || "Sin mensaje adicional."}`,
        "",
        "Archivos:",
        ...((uploadedFiles || []).length > 0
          ? uploadedFiles.map((file) => `${file.name}: ${file.downloadUrl || file.url}`)
          : ["Sin archivos adjuntos."]),
      ].join("\n"),
      replyTo: email ? [email] : undefined,
      tags: [
        { name: "source", value: "sakiara_web" },
        { name: "lead_type", value: safeLeadType },
      ],
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, id: data?.id || null });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar la solicitud." },
      { status: 500 },
    );
  }
}
