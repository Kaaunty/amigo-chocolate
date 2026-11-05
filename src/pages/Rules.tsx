import "./Rules.css";

const Rules = () => {
  return (
    <div className="rules-container">
      <div className="rules-content">
        <div className="rules-header">
          <h1 className="rules-title">
            <span className="title-icon">📋</span>
            Regras do Jogo
          </h1>
          <p className="rules-subtitle">Amigo Chocolate - Rainha das Sete</p>
        </div>

        <div className="rules-section">
          <div className="rule-card">
            <div className="rule-icon">🔒</div>
            <h2 className="rule-title">Mantenha o Segredo</h2>
            <p className="rule-description">
              O mais importante de tudo: <strong>NÃO CONTE PARA NINGUÉM</strong>{" "}
              quem você tirou no sorteio! O segredo é parte fundamental da
              brincadeira e torna a revelação muito mais especial.
            </p>
          </div>

          <div className="rule-card">
            <div className="rule-icon">🎁</div>
            <h2 className="rule-title">Como Funciona</h2>
            <p className="rule-description">
              Cada participante recebe um link único após se cadastrar. Quando o
              número mínimo de participantes for atingido, o sorteio será
              realizado automaticamente. Você poderá acessar seu resultado
              através do seu link pessoal.
            </p>
          </div>

          <div className="rule-card">
            <div className="rule-icon">🍫</div>
            <h2 className="rule-title">O Presente</h2>
            <p className="rule-description">
              Prepare um presente especial para a pessoa que você tirou! Pode
              ser um chocolate, um mimo, ou qualquer coisa que faça sentido para
              vocês. O importante é o carinho e a surpresa.
            </p>
          </div>

          <div className="rule-card">
            <div className="rule-icon">👥</div>
            <h2 className="rule-title">Participação</h2>
            <p className="rule-description">
              Todos os colaboradores podem participar! Basta se cadastrar com
              seu nome e e-mail corporativo. O sistema garante que ninguém tire
              a si mesmo no sorteio.
            </p>
          </div>

          <div className="rule-card">
            <div className="rule-icon">📧</div>
            <h2 className="rule-title">Notificações</h2>
            <p className="rule-description">
              Quando o sorteio for realizado, você receberá um e-mail com seu
              resultado. Mas não se preocupe, você sempre pode acessar seu link
              único para ver quem você tirou.
            </p>
          </div>

          <div className="rule-card ">
            <div className="rule-icon">⚠️</div>
            <h2 className="rule-title">Lembrete Importante</h2>
            <p className="rule-description">
              <strong>NÃO COMPARTILHE</strong> seu link único com outras
              pessoas. Ele é pessoal e intransferível. Cada participante deve
              ter acesso apenas ao seu próprio resultado.
            </p>
          </div>
        </div>

        <div className="rules-footer">
          <p>Divirta-se e aproveite o Amigo Chocolate! 🍫🎉</p>
        </div>
      </div>
    </div>
  );
};

export default Rules;
