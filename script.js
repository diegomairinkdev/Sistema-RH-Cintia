"use strict";
const form = document.querySelector("form");
const button = document.getElementById("candidatura");
const statusMessage = document.getElementById("status");
const modal = document.getElementById("modal-sucesso");
const fecharModal = document.getElementById("fechar-modal");
function abrirModal() {
  modal.style.display = "flex";
}

function fecharModalSucesso() {
  modal.style.display = "none";
}

fecharModal.addEventListener("click", fecharModalSucesso);
const fields = [
  "nome",
  "sobrenome",
  "email",
  "telefone",
  "cep",
  "endereco",
  "numero",
  "nascimento",
  "cpf",
  "sexo",
  "nacionalidade",
  "ensino",
];
let sending = false;
const attempts = new Set();
function message(text, error = false) {
  statusMessage.textContent = text;
  statusMessage.style.color = error ? "red" : "";
}
function validCPF(value) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(value[i]) * (length + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(value[length])) return false;
  }
  return true;
}
function validNacionalidade(value) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(value.trim());
}
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const cpf = document.getElementById("cpf");
const cep = document.getElementById("cep");
cpf.addEventListener("input", () => {
  cpf.value = cpf.value.replace(/\D/g, "").slice(0, 11);
  cpf.setCustomValidity("");
});
cep.addEventListener("input", () => {
  cep.value = cep.value.replace(/\D/g, "").slice(0, 8);
});
form.addEventListener("input", (event) => event.target.setCustomValidity?.(""));
document.getElementById("nascimento").max = today();
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending) return;
  const data = {};
  fields.forEach((id) => {
    const input = document.getElementById(id);
    input.value = input.value.trim();
    input.setCustomValidity("");
    data[id] = input.value;
  });
  if (!validNacionalidade(data.nacionalidade)) {
  document
    .getElementById("nacionalidade")
    .setCustomValidity("Informe a nacionalidade usando apenas letras.");
}
  if (!validCPF(data.cpf))
    cpf.setCustomValidity(
      "Informe um CPF válido com 11 dígitos, incluindo zeros iniciais.",
    );
  if (
    !/^(?:\d{10,11}|55\d{10,11})$/.test(data.telefone.replace(/\D/g, "")) ||
    !/^[+\d\s().-]+$/.test(data.telefone)
  )
    document
      .getElementById("telefone")
      .setCustomValidity(
        "Informe o telefone com DDD (10 ou 11 dígitos), opcionalmente com +55.",
      );
  document.getElementById("nascimento").max = today();
  if (!form.reportValidity()) return;
  const payload = new URLSearchParams(data).toString();
  if (attempts.has(payload)) {
    message(
      "Já houve uma tentativa com estes dados nesta página. Consulte o RH antes de reenviar para evitar duplicidade.",
    );
    return;
  }
  if (!navigator.onLine) {
    message(
      "Você está sem conexão. Seus dados foram mantidos; conecte-se à internet para enviar.",
    );
    return;
  }
  attempts.add(payload);
  sending = true;
  button.disabled = true;
  button.textContent = "Enviando…";
  form.setAttribute("aria-busy", "true");
  fields.forEach((id) => {
    document.getElementById(id).disabled = true;
  });
  message("Enviando sua candidatura. Aguarde e não feche esta página.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resposta = await fetch("/enviar", {
      method: "POST",
      body: new URLSearchParams(data),
      signal: controller.signal,
    });
    if (!resposta.ok) {
      throw new Error("Erro no envio da candidatura");
    }
    const resultado = await resposta.json();
    if (resultado.sucesso) {
      form.reset();
      message("");
      abrirModal();
    } else {
      message("Não foi possível registrar a candidatura.", true);
    }
  } catch {
    message("Não foi possível confirmar o envio.", true);
  } finally {
    clearTimeout(timeout);
    sending = false;
    fields.forEach((id) => {
      document.getElementById(id).disabled = false;
    });
    button.disabled = false;
    button.textContent = "Enviar candidatura";
    form.setAttribute("aria-busy", "false");
    statusMessage.focus();
  }
});
