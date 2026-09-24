export async function onRequestPost(context) {
  const dados = await context.request.formData();
  try {
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
    const resultado = await respostaGoogle.json();

    if (resultado.sucesso) {
      return new Response(JSON.stringify({ sucesso: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ sucesso: false }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (erro) {
    return new Response(JSON.stringify({ sucesso: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
