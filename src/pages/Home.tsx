import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParticipantForm from "../components/ParticipantForm";
import "./Home.css";

const Home = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [participantLink, setParticipantLink] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleSuccess = (link: string) => {
    setParticipantLink(link);
    setShowSuccess(true);
  };

  const handleViewResult = () => {
    const token = participantLink.split("/").pop();
    if (token) {
      navigate(`/participante/${token}`);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(participantLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="home-container">
        <div className="success-card">
          <h2 className="success-title">Você está no sorteio!</h2>
          <p className="success-message">
            Seu link único foi gerado. Guarde-o bem! Você precisará dele para
            ver quem você tirou no sorteio.
          </p>

          <div className="link-container">
            <label className="link-label">Seu link único:</label>
            <div className="link-display">
              <input
                type="text"
                value={participantLink}
                readOnly
                className="link-input"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="copy-button"
                >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <div className="success-actions">
            <button
              onClick={handleViewResult}
              className="action-button primary text-white"
            >
              Ver meu resultado
            </button>
            <button
              onClick={() => {
                setShowSuccess(false);
                setParticipantLink("");
              }}
              className="action-button secondary"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <header className="home-header">
          <img
            src="/logo.svg"
            alt="Rainha das Sete"
            className="brand-logo"
          />
          <h1 className="home-title">
            Amigo Chocolate
            <span className="visually-hidden"> Rainha das Sete</span>
          </h1>
          <p className="home-description">
            Cadastre seu nome, receba um link só seu e descubra em segredo
            quem você vai presentear com chocolate.
          </p>
        </header>

        <section className="home-bar" aria-labelledby="form-title">
          <h2 id="form-title" className="form-section-title">
            Participe do sorteio
          </h2>
          <ParticipantForm onSuccess={handleSuccess} />
        </section>

        <section className="home-info" aria-label="Como funciona">
          <ol className="steps">
            <li>Cadastre-se com o seu nome.</li>
            <li>Guarde o link único que você recebe.</li>
            <li>Quando o sorteio sair, abra o link e veja quem você tirou.</li>
          </ol>
        </section>
      </div>
    </div>
  );
};

export default Home;
