'use client';

import React from 'react';

export default function AdminAnalyticsPage() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Analytics & Métricas Operacionais</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Desempenho de conversão do funil de crédito, tempo médio de resposta e volume por categoria.
        </p>
      </div>

      {/* Funnel Metrics */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '20px' }}>Funil de Conversão Benavera</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>1. PRÉ-ANÁLISE</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '8px 0' }}>100%</div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Solicitações abertas</span>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>2. PROPOSTA GERADA</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0d9488', margin: '8px 0' }}>78.4%</div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Aprovadas pelos parceiros</span>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>3. ACEITA PELO PACIENTE</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6', margin: '8px 0' }}>62.1%</div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Opção selecionada</span>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>4. CONTRATO ASSINADO</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669', margin: '8px 0' }}>54.8%</div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Conversão final</span>
          </div>
        </div>
      </div>

      {/* SLA & Time breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>SLA de Atendimento</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Tempo médio de Pré-Análise:</span>
            <strong style={{ color: '#059669', fontSize: '14px' }}>3 min 45 seg</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Tempo médio de Análise de Crédito:</span>
            <strong style={{ color: '#059669', fontSize: '14px' }}>8 min 12 seg</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Tempo total até Proposta:</span>
            <strong style={{ color: '#059669', fontSize: '14px' }}>11 min 57 seg (Meta &lt; 15 min)</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>Distribuição por Categoria</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Odontologia (Implantes & Próteses):</span>
            <strong style={{ color: '#0f172a', fontSize: '14px' }}>48%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Cirurgia Plástica & Estética:</span>
            <strong style={{ color: '#0f172a', fontSize: '14px' }}>32%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Outros procedimentos:</span>
            <strong style={{ color: '#0f172a', fontSize: '14px' }}>20%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
