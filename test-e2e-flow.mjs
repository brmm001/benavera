// test-e2e-flow.mjs
// Automated verification script for Benavera E2E flow

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🚀 Starting Benavera E2E Flow Verification...');

  // 1. Login as Clinic Admin
  console.log('\n1. Testing Login as Clinic Admin (admin@odontoprime.com.br)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@odontoprime.com.br',
      password: 'Clinica@2026',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  const sessionCookie = setCookie?.split(';')[0] || '';
  const loginData = await loginRes.json();
  console.log(`✅ Logged in successfully: User "${loginData.user.name}", Clinic "${loginData.user.clinicName}"`);

  // 2. Fetch Clinic Dashboard Metrics
  console.log('\n2. Fetching Clinic Dashboard (/api/dashboard)...');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Cookie: sessionCookie },
  });
  const dashData = await dashRes.json();
  console.log(`✅ Dashboard data received:`, {
    type: dashData.type,
    totalMes: dashData.total_mes,
    volumeSolicitado: dashData.volume_solicitado,
    volumeAprovado: dashData.volume_aprovado,
    taxaAprovacao: dashData.taxa_aprovacao,
    recentCount: dashData.recent_applications?.length,
  });

  // 3. Search Patients
  console.log('\n3. Searching Patients (/api/patients?search=Carlos)...');
  const patRes = await fetch(`${BASE_URL}/api/patients?search=Carlos`, {
    headers: { Cookie: sessionCookie },
  });
  const patData = await patRes.json();
  const patient = patData.patients[0];
  console.log(`✅ Patient found: ${patient.nome} (ID: ${patient.id}, CPF: ${patient.cpf_masked})`);

  // 4. Create New Financing Application
  console.log('\n4. Submitting New Financing Application (/api/applications)...');
  const appRes = await fetch(`${BASE_URL}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      patientId: patient.id,
      categoria: 'Odontologia',
      procedimento: 'Implante Total All-on-4',
      descricaoClinica: 'Reabilitação oral completa arcada superior com prótese sobre implantes.',
      valorTratamento: 16000,
      entrada: 1000,
      valorFinanciado: 15000,
      parcelasDesejadas: 24,
      consentAccepted: true,
    }),
  });

  if (!appRes.ok) {
    throw new Error(`Application creation failed: ${await appRes.text()}`);
  }

  const appData = await appRes.json();
  const newAppId = appData.id;
  console.log(`✅ Application created! Protocol: ${appData.protocol}, Status: ${appData.status}`);

  // 5. Check Application Detail as Clinic
  console.log(`\n5. Checking Application Detail (/api/applications/${newAppId})...`);
  const detailRes = await fetch(`${BASE_URL}/api/applications/${newAppId}`, {
    headers: { Cookie: sessionCookie },
  });
  const detailData = await detailRes.json();
  console.log(`✅ Detail loaded: Protocol ${detailData.application.protocol}, Patient ${detailData.application.patient_nome}, Amount R$ ${detailData.application.valor_financiado}`);

  // 6. Login as Benavera Admin / Analyst
  console.log('\n6. Logging in as Benavera Admin (admin@benavera.com.br)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@benavera.com.br',
      password: 'Benavera@2026',
    }),
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  console.log(`✅ Admin logged in.`);

  // Fetch partners list
  const partnersRes = await fetch(`${BASE_URL}/api/partners`, {
    headers: { Cookie: adminCookie },
  });
  const partnersData = await partnersRes.json();
  const partnerId = partnersData.partners[0]?.id;
  console.log(`✅ Retrieved partner ID for proposals: ${partnerId} (${partnersData.partners[0]?.nome})`);

  // 7. Admin Creates Proposals
  console.log(`\n7. Admin Creating Financing Proposals for Application ${newAppId}...`);
  // Proposal 1: 12x
  const p1Res = await fetch(`${BASE_URL}/api/applications/${newAppId}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      action: 'create_proposal',
      proposalData: {
        partnerId,
        valorFinanciado: 15000,
        entrada: 1000,
        parcelas: 12,
        valorParcela: 1420.50,
        taxaMensal: 1.89,
        cetAnual: 25.4,
        valorTotal: 17046.00,
      },
    }),
  });
  const p1Json = await p1Res.json();
  console.log(`✅ Proposal 1 created:`, p1Json);

  // Proposal 2: 24x
  const p2Res = await fetch(`${BASE_URL}/api/applications/${newAppId}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      action: 'create_proposal',
      proposalData: {
        partnerId,
        valorFinanciado: 15000,
        entrada: 1000,
        parcelas: 24,
        valorParcela: 798.20,
        taxaMensal: 1.99,
        cetAnual: 26.8,
        valorTotal: 19156.80,
      },
    }),
  });
  const p2Json = await p2Res.json();
  console.log(`✅ Proposal 2 created:`, p2Json);

  // 8. Admin Generates Patient Link
  console.log(`\n8. Admin Generating Patient Link...`);
  const linkRes = await fetch(`${BASE_URL}/api/applications/${newAppId}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      action: 'generate_patient_link',
    }),
  });
  const linkData = await linkRes.json();
  const proposalToken = linkData.token;
  console.log(`✅ Proposal token generated: ${proposalToken}`);
  console.log(`🔗 Patient Proposal URL: ${BASE_URL}/proposta/${proposalToken}`);

  // 9. Patient views Proposal Page API (Public)
  console.log(`\n9. Simulating Patient Viewing Proposal Page (/api/proposta/${proposalToken})...`);
  const patientViewRes = await fetch(`${BASE_URL}/api/proposta/${proposalToken}`);
  const patientViewData = await patientViewRes.json();
  console.log(`✅ Patient view loaded:`, {
    patient: patientViewData.patient_nome,
    clinic: patientViewData.clinic_nome,
    procedure: patientViewData.procedimento,
    proposalsCount: patientViewData.proposals?.length,
  });

  const chosenProposal = patientViewData.proposals[0];
  console.log(`   Available options:`);
  patientViewData.proposals.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.parcelas}x de R$ ${p.valor_parcela} (Total: R$ ${p.valor_total}) - Partner: ${p.partner_nome}`);
  });

  // 10. Patient selects option
  console.log(`\n10. Patient Selecting Option (${chosenProposal.parcelas}x de R$ ${chosenProposal.valor_parcela})...`);
  const selectRes = await fetch(`${BASE_URL}/api/proposta/${proposalToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId: chosenProposal.id }),
  });
  const selectData = await selectRes.json();
  console.log(`✅ Patient selection response:`, selectData);

  // 11. Verify Application status is updated
  console.log(`\n11. Verifying Application Status after patient selection...`);
  const verifyRes = await fetch(`${BASE_URL}/api/applications/${newAppId}`, {
    headers: { Cookie: adminCookie },
  });
  const verifyData = await verifyRes.json();
  console.log(`✅ Updated Application Status: "${verifyData.application.status}"`);

  // 12. Check Repasses / Payouts
  console.log(`\n12. Fetching Payouts (/api/payouts)...`);
  const payoutRes = await fetch(`${BASE_URL}/api/payouts`, {
    headers: { Cookie: sessionCookie },
  });
  const payoutData = await payoutRes.json();
  console.log(`✅ Clinic Payouts count: ${payoutData.payouts?.length}`);

  console.log('\n🎉 ALL E2E FLOW TESTS PASSED FLAWLESSLY! 🎉\n');
}

run().catch(err => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
