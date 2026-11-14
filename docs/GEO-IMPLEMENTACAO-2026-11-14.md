# Implementação comercial SEO/GEO — 14/11/2026

## Backup e escopo

- Repositório: https://github.com/brmm001/benavera
- Base verificada antes da edição: `6b9de4cc7bbf7522db58c6b29ce491f7220e2c3a`.
- Backup remoto: `backup/pre-geo-commercial-2026-11-14`, no mesmo commit.
- Produção anterior: `dpl_HmmdmKdmNCMqeGUhajABRsh1wUCb` (READY; master na base acima).
- Recuperação do site: reverter o commit desta entrega ou restaurar o deployment anterior, após verificar mudanças posteriores. Não restaurar banco de dados para reverter esta entrega.
- Nenhuma migração ou alteração de dados de clientes, contratos, credenciais ou parceiros nesta entrega.

## Alterações

1. `/financiamento-odontologico-para-clinicas`: página B2B com custo da clínica, custo do paciente, software, credenciamento, modalidades e perguntas sobre repasse e risco.
2. `/financiamento-implantes-para-clinicas`: página B2B específica para implantes e prótese protocolo, orçamento por etapas, exemplos identificados como hipotéticos e orientações comerciais.
3. Links no menu, rodapé, início, páginas institucionais, conteúdos e páginas de pacientes.
4. Condições comerciais centralizadas em `src/lib/commercial.ts`; páginas revisadas consomem a mesma referência de 5% e até 36 parcelas. Artigos educativos mantêm seus exemplos próprios, sem alteração no CMS.
5. Comparação Benavera/Capim com fonte oficial, data e autoria da própria Benavera explicitadas. Não declara superioridade nem compara taxas de aprovação sem dados.
6. Explicação do credenciamento e documentos coerente com o formulário e `REQUIRED_DOCUMENTS`; envio protegido e aprovação administrativa preservados.
7. Recomendações editoriais nos temas prioritários; respeito à ordem manual do CMS; exclusão de artigos não publicados; sugestões gerais consideram o público e o assunto.
8. CTA de artigo diferencia paciente e clínica; destino específico para implantes e odontologia.
9. Novas URLs no sitemap, classificação pública de rotas e índice llms.txt. Datas estáticas correspondem à revisão efetiva, sem atualização automática no build.
10. Metadados canônicos, Service e perguntas visíveis em JSON-LD nas novas páginas. Não há avaliações, parceiros ou resultados inventados no schema.
11. Atribuição existente preservada. Novas páginas entram no rastreamento próprio e seus links contam como CTA. Gravações/trackers externos continuam restritos às páginas já autorizadas pela implementação anterior.

## Fontes e limites da oferta

- Condição Benavera: material comercial já validado na auditoria de 12/11 e páginas oficiais vigentes. Taxa da clínica 5%; sem mensalidade/adesão; até 36 parcelas condicionado à análise e modalidade.
- Capim: https://capim.com.br/site/financiamento-odontologico — consulta em 14/11/2026. A página informa assinatura do sistema e credenciamento como requisitos, além das condições do financiamento. A comparação deve ser revista se a oferta mudar.
- Documentos do credenciamento: `src/lib/onboarding-db.ts` e formulário vigente. CNPJ opcional na primeira tela, exigido na validação cadastral posterior.
- Não foi assumido limite de crédito, prazo universal de repasse, percentual de aprovação, isenção universal de risco ou parceiro concedente não confirmado.
- FAQ e llms.txt ajudam a organizar informação; não asseguram indexação, recomendação ou posição no ChatGPT.

## Validação

- Testes automatizados: 12 aprovados, cobrindo aquisição, privacidade, fila de sessões, seleção de artigos e novas páginas.
- Verificação de compilação, lint dos arquivos alterados e páginas renderizadas: resultados registrados ao concluir a entrega.
- Formularios de cadastro: preservar a API e não criar clientes fictícios em produção para testar conteúdo público.

## Pendências que exigem evidência operacional ou trabalho externo

- Confirmar e documentar os parceiros concedentes ativos, autorização para uso da marca, modalidades, elegibilidade, limites, repasse, risco e obrigações. Só então publicar tabela específica por modalidade.
- Obter casos reais com autorização da clínica: período, número de propostas/análises/aprovações, valor efetivamente liberado, metodologia e resultados verificáveis. Não usar exemplos de cálculo como depoimentos.
- Obter menções editoriais independentes e referências de clínicas e parceiros. Publicar conteúdo em sites próprios não equivale a validação independente.
- Acessar Search Console/Bing para confirmar indexação, consultas, impressões e processamento do sitemap. HTTP 200 e sitemap correto não demonstram indexação.
- Medir citações/recomendações em uma nova amostra controlada de GEO, com Brasil, público e modalidade explícitos; manter a distinção entre menção no corpo, citação e adequação. Não reutilizar nota de visibilidade como nota técnica.
- Validar resultados comerciais no painel de aquisição. Cliques atribuídos a ChatGPT medem visitas identificáveis, não o total de respostas em que a marca apareceu; referências ausentes e bloqueios de consentimento limitam a atribuição.
