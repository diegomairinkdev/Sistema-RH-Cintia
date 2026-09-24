// Temporário: somente na branch de diagnóstico; remover antes de publicar main.
const URL_GOOGLE = 'https://script.google.com/macros/s/AKfycbxkZGocKlIsKwnWW6yv1AWjVsyLQdfvyzDbHRBsd3SHaRcBEokZ4DlDJsGvRoJEjzglMw/exec';
export async function onRequestPost({request}) {
  const incoming = await request.formData();
  if(incoming.get('nome') !== 'TESTE TECNICO CODEX' || incoming.get('email') !== 'teste@example.invalid') return new Response(null,{status:400});
  // Reproduz exatamente o fetch da versão original. A resposta do script só contém sucesso.
  const response = await fetch(URL_GOOGLE,{method:'POST',body:incoming});
  const raw = await response.text();
  const safeText = raw.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,'')
    .replace(/<[^>]+>/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]')
    .replace(/https?:\/\/\S+/g,'[url]').replace(/[\w-]{30,}/g,'[id]').replace(/\d{4,}/g,'[number]').replace(/\s+/g,' ').trim().slice(0,1600);
  return Response.json({status:response.status,host:new URL(response.url).hostname,redirected:response.redirected,
    contentType:response.headers.get('content-type'),message:safeText},{headers:{'Cache-Control':'no-store'}});
}
