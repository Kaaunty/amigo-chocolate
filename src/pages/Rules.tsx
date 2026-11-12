import { Link } from "react-router-dom";
import "./Rules.css";

const Rules = () => {
  return (
    <div className="rules-container">
      <div className="rules-content">
        <header className="rules-header">
          <img src="/logo.svg" alt="Rainha das Sete" className="brand-logo" />
          <h1 className="rules-title">Regras do jogo</h1>
          <p className="rules-lead">
            Seis combinados para o Amigo Chocolate dar certo.
          </p>
        </header>

        <section className="rule-secret" aria-labelledby="regra-segredo">
          <h2 id="regra-segredo" className="rule-secret-title">
            Mantenha o segredo
          </h2>
          <p className="rule-secret-text">
            Não conte para ninguém quem você tirou. O segredo é a graça da
            brincadeira e faz a revelação valer a pena.
          </p>
        </section>

        <div className="rules-list">
          <section className="rule">
            <h2 className="rule-title">Como funciona</h2>
            <p className="rule-text">
              Cada participante recebe um link único depois de se cadastrar.
              Quando o número mínimo de participantes é atingido, o sorteio
              acontece. Você vê seu resultado pelo seu link pessoal.
            </p>
          </section>

          <section className="rule">
            <h2 className="rule-title">Quem participa</h2>
            <p className="rule-text">
              Todos os colaboradores podem participar. Basta se cadastrar com o
              seu nome. O sistema garante que ninguém tire a si mesmo.
            </p>
          </section>

          <section className="rule">
            <h2 className="rule-title">O presente</h2>
            <p className="rule-text">
              Prepare um presente para a pessoa que você tirou. Pode ser um
              chocolate, um mimo ou qualquer coisa que faça sentido para vocês.
              O que importa é o carinho e a surpresa.
            </p>
          </section>

          <section className="rule">
            <h2 className="rule-title">Avisos do sorteio</h2>
            <p className="rule-text">
              Quando o sorteio for realizado, você pode receber um e-mail com o
              resultado. Se não receber, abra o seu link único para ver quem
              você tirou.
            </p>
          </section>

          <section className="rule rule-warning">
            <h2 className="rule-title">Não compartilhe o seu link</h2>
            <p className="rule-text">
              O link é pessoal e intransferível. Cada participante deve ver
              apenas o próprio resultado.
            </p>
          </section>
        </div>

        <footer className="rules-footer">
          <p>Divirta-se e aproveite o Amigo Chocolate!</p>
          <Link to="/" className="rules-back">
            Voltar ao início
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Rules;
