'use client';

import React, { useState } from 'react';
import { getKonsigaStatusMeta } from '@/lib/partners/konsiga-catalogs';

interface KonsigaOperationalPanelProps {
  applicationId: string;
  transactionId: string;
  externalStatus?: string | null;
  externalStep?: string | null;
  signingUrl?: string | null;
  onUpdated: () => Promise<void>;
}

async function encodeInvoiceBase64(file: File): Promise<string> {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.type.toLowerCase())) {
    throw new Error('Envie a Nota Fiscal ou Recibo em PDF, JPG ou PNG.');
  }
  if (file.size > 6 * 1024 * 1024) {
    throw new Error('Arquivo excede o limite de 6 MB.');
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

export default function KonsigaOperationalPanel({
  applicationId,
  transactionId,
  externalStatus,
  externalStep,
  signingUrl,
  onUpdated,
}: KonsigaOperationalPanelProps) {
  const [busy, setBusy] = useState<'sync' | 'sms' | 'nf' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const meta = getKonsigaStatusMeta(externalStatus);
  const safeSigningUrl =
    signingUrl && signingUrl.startsWith('https://') ? signingUrl : null;
  const stepUpper = (externalStep || '').toUpperCase();
  const isCompleted =
    stepUpper === 'PROPOSTA_COMPLETA_ENVIADA' ||
    stepUpper === 'AGUARDANDO_ANALISE' ||
    stepUpper === 'ASSINATURA_DISPONIVEL' ||
    stepUpper === 'AGUARDANDO_NF' ||
    stepUpper === 'NF_ENVIADA' ||
    stepUpper === 'CREDITO_EFETUADO';

  async function callAction(actionName: string, payload: Record<string, unknown> = {}) {
    const res = await fetch(`/api/applications/${applicationId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionName, ...payload }),
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || 'Erro ao executar operação na Konsiga.');
    }
    return json;
  }

  async function handleSync() {
    setBusy('sync');
    setFeedback(null);
    try {
      const res = await callAction('konsiga_sync_status');
      const statusLabel = res.externalStatus ? getKonsigaStatusMeta(res.externalStatus).label : 'Sincronizado';
      setFeedback({
        type: 'ok',
        text: res.signingUrl
          ? `Status: ${statusLabel} · Link de assinatura disponível!`
          : `Status atualizado: ${statusLabel}.`,
      });
      await onUpdated();
    } catch (err: unknown) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao sincronizar.' });
    } finally {
      setBusy(null);
    }
  }

  async function handleResendSms() {
    setBusy('sms');
    setFeedback(null);
    try {
      const res = await callAction('konsiga_send_sms');
      setFeedback({ type: 'ok', text: res.message || 'SMS reenviado ao paciente.' });
      await onUpdated();
    } catch (err: unknown) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar SMS.' });
    } finally {
      setBusy(null);
    }
  }

  async function handleInvoiceUpload(file: File | undefined) {
    if (!file) return;
    setBusy('nf');
    setFeedback(null);
    try {
      const nfBase64 = await encodeInvoiceBase64(file);
      const res = await callAction('konsiga_upload_invoice', {
        nfBase64,
        fileName: file.name,
      });
      setFeedback({ type: 'ok', text: res.message || 'Nota Fiscal enviada para a Konsiga!' });
      await onUpdated();
    } catch (err: unknown) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar NF.' });
    } finally {
      setBusy(null);
    }
  }

  async function handleCopySignUrl() {
    if (!safeSigningUrl) return;
    await navigator.clipboard.writeText(safeSigningUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const badgeColors =
    meta.tone === 'success'
      ? { bg: '#dcfce7', color: '#047857' }
      : meta.tone === 'danger'
        ? { bg: '#fee2e2', color: '#b91c1c' }
        : meta.tone === 'warning'
          ? { bg: '#fef3c7', color: '#92400e' }
          : { bg: '#e0f2fe', color: '#0369a1' };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '18px',
        border: '1.5px solid #ccfbf1',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: 8 }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f766e' }}>
          ⚡ Operação Konsiga
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 8px',
            borderRadius: '999px',
            background: badgeColors.bg,
            color: badgeColors.color,
          }}
        >
          {meta.label}
        </span>
      </div>

      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
        {meta.description}
      </p>

      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginBottom: '12px', wordBreak: 'break-all' }}>
        Transação: {transactionId}
        {externalStep ? ` · Etapa: ${externalStep}` : ''}
      </div>

      {feedback && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '10px',
            background: feedback.type === 'ok' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'ok' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {feedback.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          onClick={handleSync}
          disabled={busy !== null}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            fontFamily: 'inherit',
            opacity: busy === 'sync' ? 0.7 : 1,
          }}
        >
          {busy === 'sync' ? 'Sincronizando…' : '🔄 Sincronizar status e link'}
        </button>

        {!isCompleted && (
          <button
            type="button"
            onClick={handleResendSms}
            disabled={busy !== null}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: '#f0fdfa',
              color: '#0f766e',
              border: '1px solid #99f6e4',
              borderRadius: '8px',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: 'inherit',
            }}
          >
            {busy === 'sms' ? 'Enviando SMS…' : '📩 Reenviar código SMS ao paciente'}
          </button>
        )}

        {safeSigningUrl && (
          <div
            style={{
              padding: '10px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#065f46', marginBottom: '6px' }}>
              Link de assinatura digital (CCB)
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href={safeSigningUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '6px 8px',
                  background: '#059669',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                Abrir link ↗
              </a>
              <button
                type="button"
                onClick={handleCopySignUrl}
                style={{
                  padding: '6px 10px',
                  background: 'white',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Envio de Nota Fiscal / Recibo (Seção 3.5) */}
        <div
          style={{
            marginTop: '4px',
            padding: '10px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
            📄 Enviar Nota Fiscal / Recibo (liberação do repasse)
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
            {stepUpper === 'NF_ENVIADA'
              ? '✓ NF já enviada para a Konsiga (você pode reenviar se necessário).'
              : 'Aceita PDF, JPG ou PNG até 6 MB.'}
          </div>
          <label
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '8px 10px',
              background: '#0f172a',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: busy ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box',
              opacity: busy === 'nf' ? 0.7 : 1,
            }}
          >
            {busy === 'nf' ? 'Enviando NF…' : 'Selecionar e enviar NF'}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={busy !== null}
              onChange={e => {
                handleInvoiceUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
