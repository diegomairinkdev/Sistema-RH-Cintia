
export async function onRequestPost(context) {
  try {
    const dados = await context.request.formData();

    const respostaGoogle = await fetch(
      "https://script.google.com/macros/s/AKfycbxkZGocKlIsKwnWW6yv1AWjVsyLQdfvyzDbHRBsd3SHaRcBEokZ4DlDJsGvRoJEjzglMw/exec",
      {
        method: "POST",
        body: dados,
      },
    );

    const texto = await respostaGoogle.text();

    return new Response(texto, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (erro) {
    return new Response(
      "Erro na comunicação: " + erro.message,
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}

