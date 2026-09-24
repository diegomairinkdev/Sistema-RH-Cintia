export async function onRequestPost(context) {
  try {
    const dados = await context.request.formData();

    const respostaGoogle = await fetch(
      "SUA_URL_DO_APPS_SCRIPT",
      {
        method: "POST",
        body: dados,
      },
    );

    const texto = await respostaGoogle.text();
    const resultadoGoogle = JSON.parse(texto);

    return new Response(
      JSON.stringify({
        sucesso: resultadoGoogle.sucesso,
      }),
      {
        status: resultadoGoogle.sucesso ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (erro) {
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: erro.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
