'use client';

import { useState } from 'react';

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);

export function SejaRepresentanteClient() {
  const [clinicas, setClinicas] = useState(10);
  const [volume, setVolume] = useState(20000);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const total = clinicas * volume;
  const receita = total * 0.05;
  const participacao = total * 0.025;
  const comissao = total * 0.025;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const msg = `Olá! Tenho interesse em ser representante da Benavera.\n\nNome: ${f.get('nome')}\nWhatsApp: ${f.get('telefone')}\nCidade/UF: ${f.get('cidade')}\nE-mail: ${f.get('email')}\nPerfil: ${f.get('perfil')}\n\nLi a Política de Privacidade e autorizo o contato sobre a parceria. Gostaria de conhecer as condições comerciais.`;
    const url = 'https://wa.me/5547992080926?text=' + encodeURIComponent(msg);
    setWhatsappUrl(url);
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="sr-root">
      <header>
        <div className="wrap">
          <a className="brand" href="#" aria-label="Benavera início">
            <img
              className="official-logo"
              src="/logo.png"
              alt="Benavera"
              width={800}
              height={200}
            />
            <small>Parceiros</small>
          </a>
          <nav aria-label="Navegação principal">
            <a href="#oportunidade">A oportunidade</a>
            <a href="#ganhos">Seus ganhos</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>
          <a className="btn" href="#candidatura">
            Quero ser parceiro <span>↗</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <h1>
                Você abre portas.
                <br />
                <em>
                  A gente amplia
                  <br />
                  as possibilidades.
                </em>
              </h1>
              <p className="lead">
                Leve novas formas de pagamento às clínicas.
                <br />
                Construa sua carteira e ganhe com os negócios
                <br className="desktop-break" /> que o seu relacionamento gera.
              </p>
              <div className="hero-actions">
                <a className="btn light" href="#candidatura">
                  Quero ser representante <span>↗</span>
                </a>
                <a className="hero-secondary" href="#ganhos">
                  Simular meus ganhos <span>→</span>
                </a>
              </div>
              <div className="hero-note">
                <span>Parceria comercial</span>
                <span>Foco em clínicas</span>
                <span>Sem mensalidade para a clínica</span>
              </div>
            </div>

            <div
              className="hero-art"
              aria-label="Ilustração de uma carteira de parceiros. Dados ilustrativos."
            >
              <div className="orbit o1" />
              <div className="orbit o2" />
              <div className="float-label">UMA CONEXÃO. NOVAS OPORTUNIDADES.</div>
              <div className="portfolio">
                <div className="portfolio-top">
                  <span className="mini-mark" aria-hidden="true">
                    ↗
                  </span>
                  <span>Seu próximo capítulo</span>
                  <span className="live-dot" />
                </div>
                <div className="portfolio-title">
                  Relacionamentos que
                  <br />
                  viram <i>resultados.</i>
                </div>
                <div className="chart-art">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="portfolio-bottom">
                  <span>
                    Você conecta.
                    <br />
                    <b>A Benavera viabiliza.</b>
                  </span>
                  <span className="circle-arrow">↗</span>
                </div>
              </div>
              <div className="floating-chip chip-a">
                <span className="chip-icon">✦</span>
                <span>
                  Clínicas parceiras
                  <br />
                  <b>Uma carteira com potencial</b>
                </span>
              </div>
              <div className="floating-chip chip-b">
                <span className="chip-icon">↗</span>
                <span>
                  Novos negócios
                  <br />
                  <b>Mais caminhos para crescer</b>
                </span>
              </div>
              <div className="art-footnote">
                Representação visual do programa de parceria.
              </div>
            </div>
          </div>
        </section>

        <div className="strap">
          <div className="wrap">
            <div className="stat">
              <strong>36x</strong>
              <span>Possibilidades de parcelamento ao paciente*</span>
            </div>
            <div className="stat">
              <strong>5%</strong>
              <span>Taxa para a clínica sobre operações efetivadas*</span>
            </div>
            <div className="stat">
              <strong>R$ 0</strong>
              <span>Adesão e mensalidade para clínicas</span>
            </div>
          </div>
        </div>

        <section className="wrap section intro" id="oportunidade">
          <div>
            <div className="eyebrow">Uma conversa que abre portas</div>
            <h2>
              A clínica quer vender.
              <br />
              O paciente precisa
              <br />
              de uma alternativa.
            </h2>
            <p>
              Entre o orçamento e o início de um tratamento, a forma de pagamento
              pode decidir o fechamento. É nesse momento que a Benavera entra.
            </p>
            <p>
              Como representante, você apresenta a solução a clínicas de
              odontologia, estética e saúde, aproxima os responsáveis e ajuda a
              construir uma carteira de parceiros.
            </p>
            <a className="textlink" href="#candidatura">
              Quero levar essa solução às clínicas →
            </a>
          </div>
          <div className="clinic">
            <div className="clinic-head">
              O QUE VOCÊ LEVA À CLÍNICA{' '}
              <span className="badge">Mais possibilidades</span>
            </div>
            <div className="quote">
              Um tratamento planejado.
              <br />
              Uma forma de pagamento
              <br />
              que viabiliza o próximo passo.
            </div>
            <div className="journey">
              <div>
                PARA O PACIENTE
                <strong>Até 36x*</strong>
              </div>
              <span>↗</span>
              <div>
                PARA A CLÍNICA
                <strong>Repasse à vista*</strong>
              </div>
            </div>
            <p className="caption">
              *Conforme aprovação, produto e condições do parceiro financeiro.
              Repasse líquido da taxa aplicável.
            </p>
          </div>
        </section>

        <section className="benefits">
          <div className="wrap section">
            <div className="section-head">
              <div>
                <div className="eyebrow">Valor para a sua carteira</div>
                <h2>
                  Você conhece as clínicas.
                  <br />
                  Nós ampliamos sua oferta.
                </h2>
              </div>
              <p>
                Amplie sua atuação com uma proposta comercial fácil de apresentar
                e conectada a uma necessidade real.
              </p>
            </div>
            <div className="cards">
              <article className="card">
                <div className="icon">↗</div>
                <h3>Aproveite suas conexões</h3>
                <p>
                  Transforme o relacionamento com donos e gestores de clínicas em
                  novas conversas de negócio.
                </p>
              </article>
              <article className="card">
                <div className="icon">◎</div>
                <h3>Construa uma carteira ativa</h3>
                <p>
                  O potencial de comissão acompanha as operações elegíveis das
                  clínicas vinculadas, conforme o contrato.
                </p>
              </article>
              <article className="card">
                <div className="icon">✦</div>
                <h3>Apresente uma oferta objetiva</h3>
                <p>
                  Sem adesão ou mensalidade para a clínica. A taxa incide sobre
                  operações efetivadas, nas condições contratadas.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="wrap section sim" id="ganhos">
          <div>
            <div className="eyebrow">Faça as contas</div>
            <h2>
              Visualize o potencial
              <br />
              da sua carteira.
            </h2>
            <p>
              Explore um cenário de operações mensais. O que gera receita é a
              movimentação elegível das clínicas, e não apenas o cadastro.
            </p>
            <div className="sim-controls">
              <label className="range-label" htmlFor="clinicas">
                Clínicas ativas{' '}
                <output id="n-clinicas">
                  {clinicas} {clinicas === 1 ? 'clínica' : 'clínicas'}
                </output>
              </label>
              <input
                id="clinicas"
                type="range"
                min={1}
                max={100}
                value={clinicas}
                onChange={(e) => setClinicas(Number(e.target.value))}
              />
              <label className="range-label" htmlFor="volume">
                Volume mensal por clínica{' '}
                <output id="n-volume">{money(volume)}</output>
              </label>
              <input
                id="volume"
                type="range"
                min={5000}
                max={100000}
                step={5000}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
            <p style={{ fontSize: '11px' }}>
              Premissas ilustrativas: taxa de 5% e divisão de 50% da receita
              Benavera com o representante. O percentual e a base de cálculo
              efetivos dependem do contrato.
            </p>
          </div>

          <div className="result" aria-live="polite">
            <div className="eyebrow">Comissão mensal estimada</div>
            <div className="amount" id="comissao">
              {money(comissao)}
            </div>
            <p>no cenário ilustrativo selecionado</p>
            <div className="calc">
              <div>
                <span>Volume total da carteira</span>
                <strong id="total">{money(total)}</strong>
              </div>
              <div>
                <span>Receita Benavera simulada · 5%</span>
                <strong id="receita">{money(receita)}</strong>
              </div>
              <div>
                <span>Participação simulada · 50%</span>
                <strong id="participacao">{money(participacao)}</strong>
              </div>
            </div>
            <p className="disclaimer">
              Exemplo bruto, sem deduzir tributos, custos ou eventuais estornos.
              Não representa promessa de ganhos. Elegibilidade, atribuição da
              carteira e pagamento seguem as regras contratuais.
            </p>
            <a
              className="btn light"
              href="#candidatura"
              style={{ width: '100%', marginTop: '25px' }}
            >
              Quero conhecer as condições <span>→</span>
            </a>
          </div>
        </section>

        <section className="benefits" id="como-funciona">
          <div className="wrap section">
            <div className="eyebrow">Do primeiro contato à operação</div>
            <h2>
              Uma parceria.
              <br />
              Quatro próximos passos.
            </h2>
            <div className="steps">
              <article className="step">
                <div className="number">01 / CONVERSAR</div>
                <h3>Apresente seu perfil</h3>
                <p>
                  Conte sua região, experiência e relacionamento com o mercado de
                  clínicas.
                </p>
              </article>
              <article className="step">
                <div className="number">02 / ALINHAR</div>
                <h3>Formalize a parceria</h3>
                <p>
                  Alinhe as regras de atuação, comissionamento e vínculo das
                  clínicas no contrato.
                </p>
              </article>
              <article className="step">
                <div className="number">03 / CONECTAR</div>
                <h3>Apresente a Benavera</h3>
                <p>
                  Prospecte clínicas e conecte os responsáveis à equipe para o
                  credenciamento.
                </p>
              </article>
              <article className="step">
                <div className="number">04 / DESENVOLVER</div>
                <h3>Ative sua carteira</h3>
                <p>
                  Acompanhe o relacionamento e incentive o uso da solução nas
                  oportunidades adequadas.
                </p>
              </article>
            </div>
            <div className="profile">
              <div>
                <h3>Você já conversa com clínicas?</h3>
                <p>
                  Representantes, consultores, agências, contabilidades e
                  fornecedores do setor podem apresentar seu perfil para
                  avaliação da parceria.
                </p>
              </div>
              <a
                className="btn"
                href="#candidatura"
                style={{ whiteSpace: 'nowrap' }}
              >
                Esse é o meu perfil ↗
              </a>
            </div>
          </div>
        </section>

        <section className="wrap section">
          <div className="faq">
            <div className="eyebrow">Tudo às claras</div>
            <h2>
              Antes de começar,
              <br />
              tire suas dúvidas.
            </h2>
            <details open>
              <summary>Como funciona a comissão?</summary>
              <p>
                A remuneração está vinculada às operações elegíveis das clínicas
                atribuídas ao representante. Percentual, base de cálculo, prazos,
                estornos e duração do vínculo são definidos no contrato. O
                simulador desta página apresenta apenas um exemplo.
              </p>
            </details>
            <details>
              <summary>Recebo apenas por cadastrar uma clínica?</summary>
              <p>
                O cadastro, por si só, não representa uma operação financeira
                concluída. Os eventos que geram comissão e as condições de
                pagamento devem estar previstos na parceria.
              </p>
            </details>
            <details>
              <summary>O que a clínica paga para utilizar a Benavera?</summary>
              <p>
                A proposta comercial é sem taxa de adesão e sem mensalidade, com
                taxa de 5% sobre operações efetivadas, conforme contratação.
                Condições do crédito ao paciente são apresentadas pelo parceiro
                financeiro.
              </p>
            </details>
            <details>
              <summary>
                Preciso fazer a análise de crédito dos pacientes?
              </summary>
              <p>
                Não. Seu papel é comercial: apresentar a solução e desenvolver o
                relacionamento com as clínicas. A análise de crédito e a oferta
                financeira cabem ao parceiro responsável.
              </p>
            </details>
            <details>
              <summary>Posso atuar em outra cidade ou estado?</summary>
              <p>
                Informe sua cidade e região no primeiro contato. A equipe
                avaliará a disponibilidade de atendimento e as condições para sua
                atuação. Exclusividade territorial só existe quando prevista no
                contrato.
              </p>
            </details>
            <details>
              <summary>A Benavera garante aprovação ou ganhos mensais?</summary>
              <p>
                Não. A aprovação depende dos critérios do parceiro financeiro.
                Seus ganhos dependem da movimentação elegível da carteira e das
                regras contratuais; não há renda garantida.
              </p>
            </details>
            <details>
              <summary>Como envio meu interesse?</summary>
              <p>
                Preencha o formulário. Ele prepara uma mensagem com os dados
                informados e abre o WhatsApp oficial da Benavera. Revise a
                mensagem e toque em enviar para concluir o contato.
              </p>
            </details>
          </div>
        </section>

        <section className="apply-section" id="inscricao">
          <div className="wrap apply-grid">
            <div className="apply-copy">
              <div className="eyebrow">FAÇA PARTE DO PRÓXIMO CAPÍTULO</div>
              <h2>
                Boas conexões
                <br />
                merecem uma
                <br />
                <em>grande parceria.</em>
              </h2>
              <p>
                Se você conhece o mercado de clínicas, já tem um bom ponto de
                partida. Vamos conversar sobre o que podemos construir juntos.
              </p>
              <div className="apply-list">
                <span>01</span> Conte sobre sua atuação
                <br />
                <span>02</span> Conheça as condições comerciais
                <br />
                <span>03</span> Comece uma nova parceria
              </div>
              <a href="https://www.benavera.com.br" className="textlink">
                Conheça a Benavera ↗
              </a>
            </div>

            <form
              className="form-card"
              id="candidatura"
              onSubmit={handleSubmit}
            >
              <div
                className="eyebrow"
                style={{ color: 'var(--purple)', marginBottom: '13px' }}
              >
                Vamos crescer juntos
              </div>
              <h2>Seja um representante.</h2>
              <p>
                Conte um pouco sobre você para iniciar a conversa com nossa
                equipe.
              </p>
              <label className="field">
                Nome completo
                <input
                  name="nome"
                  autoComplete="name"
                  placeholder="Como podemos chamar você?"
                  required
                  maxLength={100}
                />
              </label>
              <div className="two">
                <label className="field">
                  WhatsApp com DDD
                  <input
                    name="telefone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(41) 99999-9999"
                    required
                    pattern="[+()0-9 .-]{10,20}"
                    maxLength={20}
                  />
                </label>
                <label className="field">
                  Cidade / UF
                  <input
                    name="cidade"
                    autoComplete="address-level2"
                    placeholder="Curitiba / PR"
                    required
                    maxLength={80}
                  />
                </label>
              </div>
              <label className="field">
                E-mail profissional
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@empresa.com.br"
                  required
                  maxLength={150}
                />
              </label>
              <label className="field">
                Qual é o seu perfil?
                <select name="perfil" required defaultValue="">
                  <option value="">Selecione uma opção</option>
                  <option>Representante comercial</option>
                  <option>Consultor ou assessor de clínicas</option>
                  <option>Agência ou profissional de marketing</option>
                  <option>Contabilidade</option>
                  <option>Fornecedor do setor de saúde</option>
                  <option>Quero começar na área comercial</option>
                  <option>Outro perfil</option>
                </select>
              </label>
              <label className="consent">
                <input type="checkbox" required />
                <span>
                  Li a{' '}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Política de Privacidade
                  </a>{' '}
                  e autorizo o contato da Benavera sobre esta parceria.
                </span>
              </label>
              <button className="btn" type="submit">
                Conversar sobre a parceria <span>↗</span>
              </button>
              <p className="micro">
                Você revisa e envia sua candidatura no WhatsApp.
              </p>
              {whatsappUrl && (
                <div id="feedback" role="status">
                  Sua mensagem está pronta. Revise e envie no WhatsApp.{' '}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir minha candidatura no WhatsApp →
                  </a>
                </div>
              )}
            </form>
          </div>
        </section>

        <section className="final">
          <div className="wrap">
            <div>
              <div
                className="eyebrow"
                style={{ marginBottom: '18px', color: '#d8d9ff' }}
              >
                O próximo passo começa com uma conversa
              </div>
              <h2>
                Abra novas portas.
                <br />
                Cresça com a Benavera.
              </h2>
              <p>Apresente seu perfil e conheça a parceria comercial.</p>
            </div>
            <a href="#candidatura" className="btn light">
              Quero ser representante <span>↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="top">
            <a className="brand" href="/">
              <img
                className="official-logo"
                src="/logo.png"
                alt="Benavera"
                width={800}
                height={200}
              />
            </a>
            <div className="links">
              <a href="/" target="_blank" rel="noopener noreferrer">
                Conheça a Benavera ↗
              </a>
              <a href="/privacidade" target="_blank" rel="noopener noreferrer">
                Privacidade
              </a>
              <a href="/termos" target="_blank" rel="noopener noreferrer">
                Termos de uso
              </a>
            </div>
          </div>
          <p>
            A Benavera não é instituição financeira e não concede crédito
            diretamente. Disponibilidade, aprovação, prazos e condições dependem
            do parceiro financeiro responsável e da análise de cada proposta. As
            simulações de comissão são ilustrativas e não constituem oferta
            contratual ou garantia de renda.
            <br />
            <br />© 2026 Benavera Correspondentes Bancários LTDA · CNPJ
            69.952.939/0001-52.
          </p>
        </div>
      </footer>

      <a className="btn mobile-cta" href="#candidatura">
        Quero ser representante ↗
      </a>
    </div>
  );
}

