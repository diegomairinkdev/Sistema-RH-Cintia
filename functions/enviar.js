const GOOGLE_URL = "https://script.google.com/macros/s/AKfycbxkZGocKlIsKwnWW6yv1AWjVsyLQdfvyzDbHRBsd3SHaRcBEokZ4DlDJsGvRoJEjzglMw/exec";
const FIELDS = ["nome", "sobrenome", "email", "telefone", "cep", "endereco", "numero", "nascimento", "cpf", "sexo", "nacionalidade", "ensino"];
const MAX_BYTES = 16384;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function failure(code, status, state = "indeterminado") {
  return json({ sucesso: false, estado: state, codigo: code }, status);
}

async function readLimited(body) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new RangeError("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// O ContentService redireciona a resposta para uma URL temporária do Google.
// Após o POST, seguimos apenas GETs seguros; nunca repetimos a gravação.
async function sendToGoogle(body, signal) {
  let currentUrl = GOOGLE_URL;
  let response = await fetch(GOOGLE_URL, {
    method: "POST", body, redirect: "manual", signal,
    headers: { Accept: "application/json" },
  });
  for (let redirects = 0; response.status >= 300 && response.status < 400; redirects++) {
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (redirects >= 3 || ![302, 303].includes(response.status) || !location) return null;
    let target;
    try { target = new URL(location, currentUrl); } catch { return null; }
    if (target.protocol !== "https:" || target.hostname !== "script.googleusercontent.com" ||
        target.port || target.username || target.password) return null;
    currentUrl = target.href;
    response = await fetch(currentUrl, {
      method: "GET", redirect: "manual", signal,
      headers: { Accept: "application/json" },
    });
  }
  return response;
}

export async function onRequestPost({ request }) {
  const contentType = request.headers.get("content-type") || "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(contentType)) {
    return failure("FORMATO_INVALIDO", 415, "nao_registrado");
  }
  let body;
  try {
    const bytes = await readLimited(request.body);
    const incoming = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
    body = new URLSearchParams();
    for (const name of FIELDS) {
      const values = incoming.getAll(name);
      if (values.length !== 1 || typeof values[0] !== "string" ||
          !values[0].trim() || values[0].length > 1000) {
        return failure("DADOS_INVALIDOS", 400, "nao_registrado");
      }
      body.set(name, values[0].trim());
    }
    // CPF e CEP continuam strings, inclusive quando começam com zero.
    if (!/^\d{11}$/.test(body.get("cpf")) || !/^\d{8}$/.test(body.get("cep"))) {
      return failure("DADOS_INVALIDOS", 400, "nao_registrado");
    }
  } catch (error) {
    return failure(error instanceof RangeError ? "REQUISICAO_GRANDE" : "DADOS_INVALIDOS",
      error instanceof RangeError ? 413 : 400, "nao_registrado");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await sendToGoogle(body, controller.signal);
    if (!response) return failure("GOOGLE_REDIRECT_INVALIDO", 502);
    if (!response.ok) {
      await response.body?.cancel();
      return failure("GOOGLE_HTTP_ERRO", 502);
    }
    const mime = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (mime !== "application/json") {
      await response.body?.cancel();
      return failure("GOOGLE_RESPOSTA_NAO_JSON", 502);
    }
    let result;
    try {
      result = JSON.parse(new TextDecoder().decode(await readLimited(response.body)));
    } catch {
      if (controller.signal.aborted) return failure("GOOGLE_TIMEOUT", 504);
      return failure("GOOGLE_JSON_INVALIDO", 502);
    }
    // HTTP 200, HTML, resposta vazia e valores truthy não são confirmação.
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return failure("GOOGLE_CONTRATO_INVALIDO", 502);
    }
    if (result.sucesso === true) return json({ sucesso: true });
    if (result.sucesso === false) {
      // Uma exceção após appendRow pode ocorrer depois de gravar os dados.
      return failure("GOOGLE_NAO_CONFIRMOU", 502);
    }
    return failure("GOOGLE_CONTRATO_INVALIDO", 502);
  } catch {
    // Não expor mensagens do Google, corpo da requisição ou dados pessoais.
    return failure(controller.signal.aborted ? "GOOGLE_TIMEOUT" : "GOOGLE_INDISPONIVEL",
      controller.signal.aborted ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }
}

export function onRequest({ request }) {
  if (request.method === "POST") return onRequestPost({ request });
  return json({ sucesso: false, estado: "nao_registrado", codigo: "METODO_INVALIDO" },
    405, { Allow: "POST" });
}
