"use strict";
const form = document.querySelector('form');
const button = document.getElementById('candidatura');
const statusMessage = document.getElementById('status');
const fields = ['nome','sobrenome','email','telefone','endereco','nascimento','cpf','sexo','nacionalidade'];
let sending = false;
const attempts = new Set();
function message(text) { statusMessage.textContent = text; }
function validCPF(value) {
    if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
    for (let length = 9; length <= 10; length++) {
        let sum = 0;
        for (let i = 0; i < length; i++) sum += Number(value[i]) * (length + 1 - i);
        if ((sum * 10) % 11 % 10 !== Number(value[length])) return false;
    }
    return true;
}
function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
const cpf = document.getElementById('cpf');
cpf.addEventListener('input', () => { cpf.value = cpf.value.replace(/\D/g,'').slice(0,11); cpf.setCustomValidity(''); });
form.addEventListener('input', event => event.target.setCustomValidity?.(''));
document.getElementById('nascimento').max = today();
form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const data = {};
    fields.forEach(id => {
        const input = document.getElementById(id);
        input.value = input.value.trim();
        input.setCustomValidity('');
        data[id] = input.value;
    });
    if (!validCPF(data.cpf)) cpf.setCustomValidity('Informe um CPF válido com 11 dígitos, incluindo zeros iniciais.');
    if (!/^(?:\d{10,11}|55\d{10,11})$/.test(data.telefone.replace(/\D/g,'')) || !/^[+\d\s().-]+$/.test(data.telefone)) document.getElementById('telefone').setCustomValidity('Informe o telefone com DDD (10 ou 11 dígitos), opcionalmente com +55.');
    document.getElementById('nascimento').max = today();
    if (!form.reportValidity()) return;
    const payload = new URLSearchParams(data).toString();
    if (attempts.has(payload)) { message('Já houve uma tentativa com estes dados nesta página. Consulte o RH antes de reenviar para evitar duplicidade.'); return; }
    if (!navigator.onLine) { message('Você está sem conexão. Seus dados foram mantidos; conecte-se à internet para enviar.'); return; }
    attempts.add(payload);
    sending = true;
    button.disabled = true;
    button.textContent = 'Enviando…';
    form.setAttribute('aria-busy','true');
    fields.forEach(id => { document.getElementById(id).disabled = true; });
    message('Enviando sua candidatura. Aguarde e não feche esta página.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),30000);
    try {
        // Contrato original preservado: URL, POST, no-cors e nove campos URLSearchParams.
        await fetch('https://script.google.com/macros/s/AKfycbxkZGocKlIsKwnWW6yv1AWjVsyLQdfvyzDbHRBsd3SHaRcBEokZ4DlDJsGvRoJEjzglMw/exec', {
            method: 'POST', mode: 'no-cors', body: new URLSearchParams(data), signal: controller.signal
        });
        form.reset();
        message('Solicitação de envio concluída. Por favor, não envie novamente. A confirmação de recebimento deve ser consultada com o RH.');
    } catch {
        message('Não foi possível confirmar o resultado do envio. Seus dados foram mantidos. A candidatura pode ter sido recebida; consulte o RH antes de tentar novamente.');
    } finally {
        clearTimeout(timeout);
        sending = false;
        fields.forEach(id => { document.getElementById(id).disabled = false; });
        button.disabled = false;
        button.textContent = 'Enviar candidatura';
        form.setAttribute('aria-busy','false');
        statusMessage.focus();
    }
});
