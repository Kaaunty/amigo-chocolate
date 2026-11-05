import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParticipantForm from "../components/ParticipantForm";
import "./Home.css";

const Home = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [participantLink, setParticipantLink] = useState("");
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(participantLink);
    alert("Link copiado para a área de transferência!");
  };

  if (showSuccess) {
    return (
      <div className="home-container">
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h2 className="success-title">Cadastro realizado com sucesso!</h2>
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
                title="Copiar link"
              >
                📋
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
  <div className="home-backgroud">


  </div>
  return (
    <div className="home-container">
      <div className="home-backgroud"> </div>
      <div className="home-content">
        <div className="brand-banner">
          <img src="/banner.png" alt="Amigo Chocolate - Rainha das Sete" className="brand-banner-img" />
        </div>
  <div className="home-header">
    <h1 className="home-title">
      <span className="title-icon">
        Amigo Chocolate
      </span>
      <span className="title-subtitle">Rainha das Sete</span>
    </h1>

    <p className="home-description">
      Participe do sorteio e descubra quem será seu amigo chocolate!  
      Cada participante receberá um link único para acessar seu resultado.
    </p>
  </div>



        <div className="home-form-section">
          <h2 className="form-section-title">Faça seu cadastro</h2>
          <ParticipantForm onSuccess={handleSuccess} />
        </div>

        <div className="home-info">
          <div className="info-card">
            <span className="info-icon">🎁</span>
            <div>
              <h3>Como funciona?</h3>
              <p>
                Cadastre-se com seu nome. Você receberá um
                link único para acompanhar o sorteio.
              </p>
            </div>
          </div>
          <div className="info-card">
            <span className="info-icon">🔒</span>
            <div>
              <h3>Privacidade</h3>
              <p>
                Somente você terá acesso ao seu resultado através do seu link
                único.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
