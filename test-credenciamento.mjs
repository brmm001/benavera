// test-credenciamento.mjs
const BASE_URL = 'http://localhost:3000';

async function run() {
  const testEmail = `clinica_teste_${Date.now()}@exemplo.com`;
  console.log(`Testing POST /api/credenciamento with email: ${testEmail}...`);

  const res = await fetch(`${BASE_URL}/api/credenciamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nomeClinica: 'Clínica Sorriso Perfeito',
      cnpj: `${Math.floor(10 + Math.random() * 89)}.765.432/0001-10`,
      especialidade: 'Odontologia & Implantes',
      cidade: 'Campinas',
      estado: 'SP',
      nomeResponsavel: 'Dra. Mariana Costa',
      cargo: 'Diretora Clínica',
      whatsapp: '(19) 99999-8888',
      email: testEmail,
      password: 'SenhaForte@2026',
      volumeMensal: 'R$ 100 mil',
      ticketMedio: 'R$ 5.000',
    }),
  });

  const json = await res.json();
  console.log(`Status: ${res.status}`, json);

  if (res.ok) {
    console.log(`✅ Credenciamento realizado com sucesso! Tentando login com as novas credenciais...`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SenhaForte@2026',
      }),
    });

    const loginData = await loginRes.json();
    console.log(`Login status: ${loginRes.status}`, loginData);
    if (loginRes.ok) {
      console.log(`🎉 Nova clínica credenciada e logada com sucesso! User: ${loginData.user.name}, Clinic: ${loginData.user.clinicName}`);
    }
  }
}

run().catch(console.error);
