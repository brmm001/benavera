# SEO, GEO e aquisição — 12/11/2026

## Recuperação

- Código original: commit `8d64598d51877fe316f4d5982854469d7d223ad5`, branch `backup/pre-seo-geo-2026-11-12`.
- Publicação anterior: `dpl_499EBf4Gm7XyBbXowHGiAGiW9Rui` no projeto Vercel Benavera.
- Banco: branch Neon `backup-pre-seo-geo-2026-11-12`, criada a partir de production antes das mudanças. Inclui artigos e documentos armazenados no PostgreSQL. Sem compute permanente.
- Restauração de ensaio: branch `seo-geo-validation-2026-11-12`, derivada do backup. O ambiente de preview usa essa cópia e credenciais administrativas próprias.
- As variáveis de produção não foram substituídas. Seus valores continuam no cofre Vercel. Não existem credenciais neste repositório.
- Para reverter só o site, restaurar a publicação anterior na Vercel ou reverter o commit de entrega. Não restaurar todo o banco sobre a produção: isso descartaria operações posteriores ao backup.
- As novas tabelas usam prefixo `bv_`; a migração é aditiva. O artigo de teste passa a rascunho, sem exclusão. Para reversão de conteúdo, recuperar apenas o registro necessário do backup.

## Conteúdo e publicação

A página `/condicoes` é a referência comercial pública. Fonte: material Benavera_Clinicas_Taxa_5.pdf vigente, revisado em 04/11/2026. Taxa da clínica 5%; sem mensalidade/adesão; até 36 parcelas conforme análise e modalidade. Juros, CET, elegibilidade, repasse e responsabilidades são definidos na proposta e no contrato.

Não publicar D+1 universal, percentuais de aumento de conversão, taxas de aprovação, avaliações ou casos de sucesso sem comprovação. Simulações não são ofertas. Atualizações técnicas não equivalem a revisão por especialista.

`getPublicArticles` é a regra comum para artigos, listagem, relacionados, sitemap e llms.txt. Um rascunho existente no CMS prevalece sobre a cópia estática. O artigo de teste é excluído de todas as superfícies públicas. O cache de publicação é invalidado nas operações do CMS. Markdown não executa HTML ou JavaScript.

As páginas públicas são renderizadas no servidor. O domínio canônico é `https://www.benavera.com.br`. Datas de sitemap usam atualizações reais de artigos; páginas sem data editorial confiável não recebem lastmod artificial.

## Painel de aquisição

Acesse `/admin/aquisicao` com perfil administrador ou analista. Disponível: 7/30/90 dias, sessões, páginas, WhatsApp, campanhas, entradas, leads, clínicas cadastradas/ativas, financiamentos liberados e CSV agregado. O gerador cria links com UTMs e código de representante; códigos precisam existir no cadastro comercial.

Primeiro contato, último contato e último contato identificável são registrados no banco após consentimento. O vínculo com leads ocorre no servidor, depois da gravação real. As etapas comerciais são uma coorte de cadastros no período e seus resultados acumulados. Não some as etapas como pessoas diferentes. Volume financiado não é receita da Benavera.

ChatGPT só é atribuído quando há referrer ou UTM identificável. Citação sem clique não gera visita. Sem sinal de origem, a visita permanece em direto / não identificado. Bloqueadores, recusa de consentimento, troca de dispositivo e perda de cookies limitam a medição.

Cliques no WhatsApp não comprovam envio de mensagem ou venda. Conversas externas e negócios fora do sistema precisam de integração/autorização específica ou atualização operacional.

## Privacidade e configuração

- Cookie `bv_consent`: escolha de privacidade por 180 dias.
- `bv_sid`: sessão analítica por 30 minutos; `bv_vid`: visitante por 90 dias; ambos HttpOnly.
- Sem métricas opcionais antes de consentimento. Campanhas são sanitizadas. Referências guardam apenas o domínio; URLs não incluem query strings ou tokens.
- Nomes, documentos, telefones e dados financeiros dos formulários não são enviados aos rastreadores.
- Google Ads e Clarity são limitados a páginas institucionais e consentimento de marketing. Formulários, artigos de tratamentos e áreas privadas ficam fora dos scripts externos. A navegação para essas áreas descarrega o documento com rastreadores.
- O Clarity existente é mantido com mascaramento. Não criar um projeto duplicado.
- GA4 opcional: informar `NEXT_PUBLIC_GA4_MEASUREMENT_ID` com o ID real do fluxo web. Não há ID GA4 configurado na produção auditada. O painel interno funciona sem ele.
- Google Ads existente: `AW-625816226`. Conversões offline e metas Ads precisam de ação de conversão, acesso à conta e validação; não são ativadas por suposição.
- Search Console e Bing Webmaster Tools: verificar acesso, propriedade e enviar sitemap. Campos de verificação do domínio estão preparados. Não afirmar envio ou indexação sem confirmação na conta.

## Medição de GEO

O painel permite registrar observações manuais de respostas de ChatGPT, Perplexity, Gemini e Copilot. Registrar pergunta exata, data, menções e URL citada. Repetir a mesma cesta de perguntas em conversas novas, com idioma/localidade equivalentes. Não confundir esse registro com consultas automáticas ou ranking universal.

Perguntas de referência:

1. Quais empresas oferecem financiamento odontológico para clínicas?
2. Como oferecer parcelamento de implantes dentários sem cartão?
3. Que alternativas à Capim existem para clínicas?
4. Financiamento para clínica sem mensalidade: como comparar?
5. Como financiar um tratamento de saúde em até 36 vezes?
6. Benavera ou Capim: quais condições preciso comparar?
7. Como avaliar risco de inadimplência no financiamento de pacientes?
8. Quais custos a clínica precisa conferir antes de contratar?

## Dependências externas

- Casos reais autorizados, resultados próprios, fontes independentes e referências de parceiros precisam existir e ser comprovados; não podem ser criados como fatos por código.
- Perfis sociais e Google Business Profile precisam de confirmação de titularidade/elegibilidade. Não inserir sameAs inventado nem endereço residencial por inferência.
- A auditoria de sobreposição editorial depende de consultas e impressões do Search Console. Não remover ou redirecionar artigos indiscriminadamente sem dados.
- O acesso de bots foi preservado. Validação de requisições reais exige logs de produção e verificação do IP do crawler; mudar o User-Agent em um teste não comprova isso.
- Correções técnicas e conteúdo claro aumentam a elegibilidade; não garantem substituir a Capim em respostas de IA.

## Verificação

`npm test` testa origem, canais, proteção de dados, datas e serialização JSON-LD. `npm run build` verifica compilação e renderização. A revisão de lint compara os arquivos alterados com o commit anterior para separar problemas existentes de regressões. A revisão pública deve conferir sitemap, canonical, noindex, redirects, links, artigo de teste, eventos e consentimento.
