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

    if (!respostaGoogle.ok) {
      throw new Error("Erro na comunicação com o Google Apps Script");
    }

    const texto = await respostaGoogle.text();

    return new Response(
      JSON.stringify({
        sucesso: true,
        respostaGoogle: texto,
      }),
      {
        status: 200,
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
