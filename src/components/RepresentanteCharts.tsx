'use client';
// src/components/RepresentanteCharts.tsx
// Gráficos do dashboard do representante (recharts). Recebe apenas dados agregados.

import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import type { DashboardData } from '@/lib/representantes-db';
import { brl, brlCompact } from './rep-format';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#94a3b8', '#06b6d4'];
const STATUS_COLORS: Record<string, string> = {
  'Liberadas': '#10b981', 'Contrato assinado': '#06b6d4', 'Aprovadas': '#6366f1',
  'Em análise': '#f59e0b', 'Recusadas': '#ef4444', 'Canceladas/expiradas': '#94a3b8',
};

function Empty({ text }: { text: string }) {
  return <div className="rep-empty">{text}</div>;
}

export function ComissaoMensalChart({ data }: { data: DashboardData['serieMensal'] }) {
  if (!data.some(d => d.comissao > 0)) return <Empty text="Sem comissões ainda. Elas aparecem conforme os repasses das suas clínicas." />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={brlCompact} />
        <Tooltip formatter={(v) => brl(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="comissao" name="Comissão gerada" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Line dataKey="comissaoPaga" name="Paga" stroke="#6366f1" strokeWidth={2} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function VolumeMensalChart({ data }: { data: DashboardData['serieMensal'] }) {
  if (!data.some(d => d.propostas > 0)) return <Empty text="Sem propostas no período." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="v" tick={{ fontSize: 11 }} tickFormatter={brlCompact} />
        <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v, n) => (n === 'Propostas' ? String(v) : brl(Number(v)))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="v" dataKey="volume" name="Volume solicitado" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Line yAxisId="p" dataKey="propostas" name="Propostas" stroke="#f59e0b" strokeWidth={2} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function FunilChart({ data }: { data: DashboardData['funil'] }) {
  if (data[0].valor === 0) return <Empty text="Sem propostas no período." />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="etapa" width={110} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="valor" name="Propostas" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: DashboardData['statusDistribuicao'] }) {
  if (data.length === 0) return <Empty text="Sem propostas no período." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={86} paddingAngle={2}>
          {data.map(d => <Cell key={d.nome} fill={STATUS_COLORS[d.nome] || '#94a3b8'} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProcedimentoChart({ data }: { data: DashboardData['porProcedimento'] }) {
  if (data.length === 0) return <Empty text="Sem dados de procedimentos." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={brlCompact} />
        <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => brl(Number(v))} />
        <Bar dataKey="volume" name="Volume" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankingChart({ data }: { data: DashboardData['ranking'] }) {
  const top = data.filter(d => d.comissao > 0).slice(0, 6);
  if (top.length === 0) return <Empty text="Nenhuma clínica gerou comissão ainda." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 42)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={brlCompact} />
        <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => brl(Number(v))} />
        <Bar dataKey="comissao" name="Comissão" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

