'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusCircle, Edit3, Trash2, Eye, EyeOff, Globe, FileText,
  ChevronLeft, Search, Upload, Download, RefreshCw, LogOut,
  CheckCircle, Clock, AlertCircle, X, Save, Loader2,
  ArrowLeft, ExternalLink, Tag, BookOpen, Link2,
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import type { BlogArticle, BlogArticleInput, BlogStatus } from '@/lib/blog-db';
import type { ArticleCategory } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'tratamentos-e-custos', label: 'Tratamentos e Custos' },
  { value: 'formas-de-pagamento', label: 'Formas de Pagamento' },
  { value: 'planejamento-financeiro', label: 'Planejamento Financeiro' },
  { value: 'para-clinicas', label: 'Para Clínicas' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)); }
  catch { return iso; }
}

const STATUS_CONFIG = {
  published: { label: 'Publicado', color: '#4ade80', bg: 'rgba(74,222,128,0.12)', dot: '#4ade80' },
  draft:     { label: 'Rascunho', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  dot: '#fb923c' },
};

// ─── Initial blank article ────────────────────────────────────────────────────

function blankArticle(): Partial<BlogArticleInput> {
  return {
    title: '',
    slug: '',
    seoTitle: '',
    description: '',
    content: '',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'tratamentos-e-custos',
    keywords: [],
    relatedArticles: [],
    sources: [],
    status: 'draft',
  };
}

// ─── BULK IMPORT FORMAT EXAMPLE ───────────────────────────────────────────────

const BULK_EXAMPLE = `[
  {
    "title": "Título do Artigo",
    "slug": "titulo-do-artigo",
    "description": "Meta description em até 160 caracteres.",
    "content": "## Introdução\\n\\nConteúdo em markdown...",
    "author": "Equipe Benavera",
    "category": "tratamentos-e-custos",
    "keywords": ["palavra chave 1", "palavra chave 2"],
    "sources": [{"title": "Fonte", "url": "https://...", "organization": "Org"}],
    "relatedArticles": [],
    "status": "published"
  }
]`;

// ─── SEO Preview ──────────────────────────────────────────────────────────────

function SeoPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const url = `benavera.com.br/conteudos/${slug || 'slug-do-artigo'}`;
  const displayTitle = title.slice(0, 60) + (title.length > 60 ? '...' : '');
  const displayDesc = description.slice(0, 160) + (description.length > 160 ? '...' : '');

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
      <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
        Preview Google
      </p>
      <div style={{ fontFamily: 'arial, sans-serif' }}>
        <p style={{ fontSize: '12px', color: '#4ade80', margin: '0 0 2px' }}>{url}</p>
        <p style={{ fontSize: '18px', color: '#818cf8', margin: '0 0 4px', fontWeight: '400', lineHeight: '1.3' }}>
          {displayTitle || 'Título do artigo aparece aqui'}
        </p>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
          {displayDesc || 'Meta description do artigo — aparece nos resultados de busca do Google (até 160 caracteres).'}
        </p>
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: title.length > 60 ? '#f87171' : '#64748b' }}>
          Título: {title.length}/60
        </span>
        <span style={{ fontSize: '10px', color: description.length > 160 ? '#f87171' : '#64748b' }}>
          Description: {description.length}/160
        </span>
      </div>
    </div>
  );
}

// ─── Article Editor ───────────────────────────────────────────────────────────

function ArticleEditor({
  article,
  onSave,
  onCancel,
  isSaving,
}: {
  article: Partial<BlogArticleInput> & { id?: string };
  onSave: (data: Partial<BlogArticleInput>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(article);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'sources'>('content');

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleTitleChange = (title: string) => {
    set('title', title);
    if (!form.slug || form.slug === slugify(form.title ?? '')) {
      set('slug', slugify(title));
    }
  };

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    const kws = keywordInput.split(',').map(k => k.trim()).filter(Boolean);
    set('keywords', [...(form.keywords ?? []), ...kws]);
    setKeywordInput('');
  };

  const removeKeyword = (idx: number) => {
    set('keywords', (form.keywords ?? []).filter((_, i) => i !== idx));
  };

  const addSource = () => {
    set('sources', [...(form.sources ?? []), { title: '', url: '', organization: '' }]);
  };

  const updateSource = (idx: number, key: string, val: string) => {
    const sources = [...(form.sources ?? [])];
    sources[idx] = { ...sources[idx], [key]: val };
    set('sources', sources);
  };

  const removeSource = (idx: number) => {
    set('sources', (form.sources ?? []).filter((_, i) => i !== idx));
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: 'white', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: '700' as const,
    color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    marginBottom: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%' }}>
      {/* Editor Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
          }}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <span style={{ color: '#1e293b' }}>|</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
            {article.id ? 'Editar Artigo' : 'Novo Artigo'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onSave({ ...form, status: 'draft' })}
            disabled={isSaving || !form.title || !form.slug}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: '13px', cursor: 'pointer', fontWeight: '500',
            }}
          >
            <Save size={13} /> Salvar Rascunho
          </button>
          <button
            onClick={() => onSave({ ...form, status: 'published' })}
            disabled={isSaving || !form.title || !form.slug || !form.description || !form.content}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              opacity: (!form.title || !form.slug || !form.description || !form.content) ? 0.5 : 1,
            }}
          >
            {isSaving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={13} />}
            Publicar
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', flex: 1, overflow: 'hidden' }}>

        {/* Left — Main Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Título do Artigo *</label>
            <input
              value={form.title ?? ''}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Ex: Como parcelar um implante dentário em 2026"
              style={{ ...inputStyle, fontSize: '16px', fontWeight: '600' }}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Slug (URL) *</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#334155', whiteSpace: 'nowrap' }}>
                /conteudos/
              </span>
              <input
                value={form.slug ?? ''}
                onChange={e => set('slug', slugify(e.target.value))}
                placeholder="como-parcelar-implante-dentario"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
            {([['content', 'Conteúdo', FileText], ['seo', 'SEO', Tag], ['sources', 'Fontes', Link2]] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', background: 'none', border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  color: activeTab === tab ? '#818cf8' : '#475569',
                  fontSize: '13px', fontWeight: activeTab === tab ? '700' : '400',
                  cursor: 'pointer', marginBottom: '-1px',
                }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Corpo do Artigo (Markdown) *</label>
                <p style={{ fontSize: '11px', color: '#334155', margin: '0 0 8px' }}>
                  Use ## para H2, ### para H3, **negrito**, *itálico*, listas com - e tabelas com |
                </p>
                <textarea
                  value={form.content ?? ''}
                  onChange={e => set('content', e.target.value)}
                  placeholder={`## Resposta rápida\n\nExplique o tema em 2-3 frases objetivas...\n\n## Como funciona?\n\n...\n\n## Perguntas frequentes\n\n**Pergunta?**\nResposta aqui.`}
                  style={{
                    ...inputStyle,
                    minHeight: '420px',
                    resize: 'vertical',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                />
                <p style={{ fontSize: '11px', color: '#334155', margin: '4px 0 0' }}>
                  {form.content?.length ?? 0} caracteres · {Math.max(1, Math.ceil((form.content?.split(/\s+/).length ?? 0) / 200))} min de leitura estimado
                </p>
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Meta Description * <span style={{ color: '#334155' }}>(aparece no Google)</span></label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Descreva o artigo em até 160 caracteres. Inclua a keyword principal."
                  style={{ ...inputStyle, minHeight: '80px', resize: 'none' }}
                />
              </div>
              <div>
                <label style={labelStyle}>SEO Title <span style={{ color: '#334155' }}>(opcional — se diferente do título)</span></label>
                <input
                  value={form.seoTitle ?? ''}
                  onChange={e => set('seoTitle', e.target.value)}
                  placeholder="Título para <title> tag (até 60 caracteres)"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Categoria *</label>
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} style={{ background: '#0f1629' }}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Keywords (palavras-chave)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Digite uma keyword e pressione Enter (ou separe por vírgula)"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={addKeyword} style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                    color: '#818cf8', cursor: 'pointer', fontSize: '13px',
                  }}>
                    + Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(form.keywords ?? []).map((kw, i) => (
                    <span key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: '20px', padding: '3px 10px', fontSize: '12px', color: '#818cf8',
                    }}>
                      {kw}
                      <button onClick={() => removeKeyword(i)} style={{
                        background: 'none', border: 'none', color: '#475569', cursor: 'pointer',
                        padding: '0', display: 'flex',
                      }}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Autor</label>
                <input value={form.author ?? ''} onChange={e => set('author', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Revisor</label>
                <input value={form.reviewer ?? ''} onChange={e => set('reviewer', e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}

          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                Fontes aumentam o E-E-A-T (expertise/autoridade). Use fontes governamentais, CFO, BCB, Sebrae, etc.
              </p>
              {(form.sources ?? []).map((src, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>Fonte {i + 1}</span>
                    <button onClick={() => removeSource(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input value={src.title} onChange={e => updateSource(i, 'title', e.target.value)} placeholder="Título da fonte" style={inputStyle} />
                  <input value={src.url} onChange={e => updateSource(i, 'url', e.target.value)} placeholder="https://..." style={inputStyle} />
                  <input value={src.organization} onChange={e => updateSource(i, 'organization', e.target.value)} placeholder="Organização (ex: Banco Central do Brasil)" style={inputStyle} />
                </div>
              ))}
              <button onClick={addSource} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)',
                color: '#475569', cursor: 'pointer', fontSize: '13px', justifyContent: 'center',
              }}>
                <PlusCircle size={14} /> Adicionar Fonte
              </button>
            </div>
          )}
        </div>

        {/* Right — SEO Sidebar */}
        <div style={{
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          padding: '24px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '20px',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <SeoPreview
            title={form.seoTitle || form.title || ''}
            description={form.description || ''}
            slug={form.slug || ''}
          />

          {/* SEO Checklist */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              SEO Checklist
            </p>
            {[
              { label: 'Título preenchido', ok: (form.title?.length ?? 0) > 10 },
              { label: 'Título ≤ 60 chars', ok: (form.title?.length ?? 0) <= 60 },
              { label: 'Description preenchida', ok: (form.description?.length ?? 0) > 30 },
              { label: 'Description ≤ 160 chars', ok: (form.description?.length ?? 0) <= 160 },
              { label: 'Slug definido', ok: (form.slug?.length ?? 0) > 3 },
              { label: 'Conteúdo > 500 palavras', ok: (form.content?.split(/\s+/).length ?? 0) > 500 },
              { label: 'Categoria selecionada', ok: !!form.category },
              { label: '3+ keywords', ok: (form.keywords?.length ?? 0) >= 3 },
              { label: '1+ fonte referenciada', ok: (form.sources?.length ?? 0) >= 1 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                {ok
                  ? <CheckCircle size={13} color="#4ade80" />
                  : <AlertCircle size={13} color="#f87171" />
                }
                <span style={{ fontSize: '12px', color: ok ? '#4ade80' : '#64748b' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* AI Readability tip */}
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
              💡 Dicas para IAs (Google AI + ChatGPT)
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: '11px', color: '#64748b', lineHeight: '1.8' }}>
              <li>Comece com "## Resposta rápida"</li>
              <li>Use seção "## Perguntas frequentes"</li>
              <li>Headers sem pular (h2 → h3, não h2 → h4)</li>
              <li>Inclua tabelas comparativas</li>
              <li>Cite fontes autoritativas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────

function BulkImportModal({ onClose, onImport }: { onClose: () => void; onImport: (json: string) => void }) {
  const [json, setJson] = useState('');
  const [tab, setTab] = useState<'paste' | 'example'>('paste');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '720px', maxHeight: '90vh',
        background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>Importar Artigos em Massa</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569' }}>Cole um array JSON com múltiplos artigos</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '12px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[['paste', 'Colar JSON'], ['example', 'Ver Exemplo']] .map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as 'paste' | 'example')} style={{
              padding: '6px 14px', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t ? '#818cf8' : '#475569',
              fontSize: '13px', fontWeight: tab === t ? '700' : '400',
              cursor: 'pointer', marginBottom: '-1px',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {tab === 'paste' ? (
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              placeholder={BULK_EXAMPLE}
              style={{
                width: '100%', minHeight: '280px', padding: '14px',
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: 'white', fontSize: '12px',
                fontFamily: "'Courier New', monospace", lineHeight: '1.6',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          ) : (
            <pre style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '14px', fontSize: '11px',
              color: '#94a3b8', fontFamily: "'Courier New', monospace",
              lineHeight: '1.6', overflowX: 'auto', margin: 0,
            }}>
              {BULK_EXAMPLE}
            </pre>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: '9px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
          }}>
            Cancelar
          </button>
          <button onClick={() => { if (json.trim()) { onImport(json); onClose(); } }} disabled={!json.trim()} style={{
            padding: '9px 20px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none', color: 'white', cursor: json.trim() ? 'pointer' : 'not-allowed',
            fontSize: '13px', fontWeight: '600',
            opacity: json.trim() ? 1 : 0.5,
          }}>
            <Upload size={13} style={{ display: 'inline', marginRight: '6px' }} />
            Importar Artigos
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main BlogManager ─────────────────────────────────────────────────────────

export function BlogManager({ initialArticles }: { initialArticles: BlogArticle[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [articles, setArticles] = useState<BlogArticle[]>(initialArticles);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingArticle, setEditingArticle] = useState<(Partial<BlogArticleInput> & { id?: string }) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refreshArticles = useCallback(async () => {
    startTransition(() => router.refresh());
    const res = await fetch('/api/admin/blog?status=all');
    const data = await res.json();
    if (data.success) setArticles(data.articles);
  }, [router]);

  const handleNewArticle = () => {
    setEditingArticle(blankArticle());
    setView('editor');
  };

  const handleEditArticle = (article: BlogArticle) => {
    setEditingArticle({
      id: article.id,
      title: article.title,
      slug: article.slug,
      seoTitle: article.seoTitle,
      description: article.description,
      content: article.content,
      author: article.author,
      reviewer: article.reviewer,
      category: article.category,
      keywords: article.keywords,
      relatedArticles: article.relatedArticles,
      sources: article.sources,
      status: article.status,
    });
    setView('editor');
  };

  const handleSaveArticle = async (data: Partial<BlogArticleInput>) => {
    if (!data.title || !data.slug) return;
    setIsSaving(true);
    try {
      const isEdit = !!editingArticle?.id;
      const url = isEdit ? `/api/admin/blog/${editingArticle!.id}` : '/api/admin/blog';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast(data.status === 'published' ? '✓ Artigo publicado!' : '✓ Rascunho salvo!');
        setView('list');
        await refreshArticles();
      } else {
        showToast('Erro ao salvar artigo.', 'err');
      }
    } catch {
      showToast('Erro de conexão.', 'err');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deletar "${title}"? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Artigo deletado.'); await refreshArticles(); }
    else showToast('Erro ao deletar.', 'err');
  };

  const handleToggleStatus = async (article: BlogArticle) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    const res = await fetch(`/api/admin/blog/${article.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      showToast(newStatus === 'published' ? '✓ Publicado!' : '✓ Movido para rascunho');
      await refreshArticles();
    }
  };

  const handleBulkImport = async (json: string) => {
    setIsImporting(true);
    try {
      let articles: any[] = [];
      try {
        const parsed = JSON.parse(json);
        articles = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Fallback to JSONL format
        const lines = json.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) throw new Error('Empty input');
        articles = lines.map(l => JSON.parse(l));
      }

      const res = await fetch('/api/admin/blog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, articles }),
      });
      const data = await res.json();
      if (data.success) {
        const errorsMsg = data.errors?.length > 0 ? ` (${data.errors.length} erros)` : '';
        showToast(`✓ ${data.created} artigo(s) importado(s)!${errorsMsg}`);
        await refreshArticles();
      } else {
        showToast('Erro na importação.', 'err');
      }
    } catch {
      showToast('Formato inválido. Use JSON ou JSONL válido.', 'err');
    }
    setIsImporting(false);
  };

  const filtered = articles.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.category.includes(q);
    return matchStatus && matchSearch;
  });

  const publishedCount = articles.filter(a => a.status === 'published').length;
  const draftCount = articles.filter(a => a.status === 'draft').length;

  return (
    <div style={{
      minHeight: '100vh', background: '#080d1a', color: 'white',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        ::placeholder { color: #2d3a55 !important; }
        textarea, input, select { color: white !important; }
        option { background: #0f1629 !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 2000,
          background: toast.type === 'ok' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
          border: `1px solid ${toast.type === 'ok' ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
          borderRadius: '10px', padding: '12px 20px', fontSize: '13px', fontWeight: '600',
          color: toast.type === 'ok' ? '#4ade80' : '#f87171',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="/admin/leads" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', textDecoration: 'none', fontSize: '13px' }}>
              <ArrowLeft size={14} /> CRM
            </a>
            <span style={{ color: '#1e293b' }}>|</span>
            <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              bena<span style={{ color: '#818cf8' }}>vera</span>
            </span>
            <span style={{
              fontSize: '10px', fontWeight: '700', color: '#6366f1',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '5px', padding: '2px 7px', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>BLOG</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={isImporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <Upload size={13} /> Importar em Massa
            </button>

            {view === 'list' && (
              <button onClick={handleNewArticle} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 16px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', color: 'white', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}>
                <PlusCircle size={13} /> Novo Artigo
              </button>
            )}

            <button onClick={() => logout()} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: '13px', cursor: 'pointer',
            }}>
              <LogOut size={13} /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      {view === 'editor' && editingArticle ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ArticleEditor
            article={editingArticle}
            onSave={handleSaveArticle}
            onCancel={() => { setView('list'); setEditingArticle(null); }}
            isSaving={isSaving}
          />
        </div>
      ) : (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: 'Total de Artigos', value: articles.length, color: 'white' },
              { label: 'Publicados', value: publishedCount, color: '#4ade80' },
              { label: 'Rascunhos', value: draftCount, color: '#fb923c' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '20px',
              }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{label}</p>
                <p style={{ fontSize: '32px', fontWeight: '800', color, margin: 0, letterSpacing: '-0.03em' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por título, categoria..."
                style={{
                  width: '100%', padding: '10px 12px 10px 34px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: 'white', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
              style={{
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">Todos</option>
              <option value="published">Publicados</option>
              <option value="draft">Rascunhos</option>
            </select>

            <button onClick={refreshArticles} disabled={isPending} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
              borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
            }}>
              <RefreshCw size={13} style={{ animation: isPending ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Articles Table */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#334155' }}>
                <BookOpen size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {articles.length === 0 ? 'Nenhum artigo ainda. Crie o primeiro!' : 'Nenhum resultado.'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Título', 'Categoria', 'Status', 'Publicado em', 'Ações'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: '10px', fontWeight: '700', color: '#334155',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(article => {
                    const st = STATUS_CONFIG[article.status];
                    const cat = CATEGORIES.find(c => c.value === article.category);
                    return (
                      <tr key={article.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 16px', maxWidth: '360px' }}>
                          <p style={{ margin: '0 0 2px', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {article.title}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#334155', fontFamily: 'monospace' }}>
                            /conteudos/{article.slug}
                          </p>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {cat?.label ?? article.category}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '20px',
                            background: st.bg, color: st.color, fontSize: '11px', fontWeight: '700',
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {fmt(article.publishedAt ?? article.createdAt)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => handleEditArticle(article)} title="Editar" style={{
                              padding: '5px 8px', borderRadius: '7px',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                              color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            }}>
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => handleToggleStatus(article)}
                              title={article.status === 'published' ? 'Mover para rascunho' : 'Publicar'}
                              style={{
                                padding: '5px 8px', borderRadius: '7px',
                                background: article.status === 'published' ? 'rgba(251,146,60,0.1)' : 'rgba(74,222,128,0.1)',
                                border: `1px solid ${article.status === 'published' ? 'rgba(251,146,60,0.25)' : 'rgba(74,222,128,0.25)'}`,
                                color: article.status === 'published' ? '#fb923c' : '#4ade80',
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                              }}>
                              {article.status === 'published' ? <EyeOff size={13} /> : <Globe size={13} />}
                            </button>
                            {article.status === 'published' && (
                              <a href={`/conteudos/${article.slug}`} target="_blank" rel="noopener" title="Ver no site" style={{
                                padding: '5px 8px', borderRadius: '7px',
                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                                color: '#818cf8', display: 'flex', alignItems: 'center',
                              }}>
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button onClick={() => handleDelete(article.id, article.title)} title="Deletar" style={{
                              padding: '5px 8px', borderRadius: '7px',
                              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                              color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {filtered.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#334155' }}>
                {filtered.length} artigo{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </main>
      )}

      {showBulkModal && (
        <BulkImportModal onClose={() => setShowBulkModal(false)} onImport={handleBulkImport} />
      )}
    </div>
  );
}
