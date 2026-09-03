'use client';

import { useActionState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { login } from '@/app/actions/auth';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verificando...</span>
        </>
      ) : (
        <>
          <span>Entrar no Painel</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel Administrativo</h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Acesso restrito e protegido
          </p>
        </div>

        {state?.error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Senha de Acesso
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              placeholder="Digite a chave mestra"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <SubmitButton />
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500">
            Sessão criptografada • Proteção contra força bruta ativa
          </p>
        </div>
      </div>
    </div>
  );
}
