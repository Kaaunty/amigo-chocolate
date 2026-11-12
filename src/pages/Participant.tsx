import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getParticipantByToken, getDrawStatus } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { FireworksBackground } from "../components/ui/shadcn-io/fireworks-background";
import type {
  Participant as ParticipantType,
  MatchedParticipant,
} from "../types";
import "./Participant.css";

const Participant = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<ParticipantType | null>(null);
  const [matchedParticipant, setMatchedParticipant] =
    useState<MatchedParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [drawStatus, setDrawStatus] = useState<{
    isDrawn: boolean;
    totalParticipants: number;
    unmatchedParticipants?: number;
    minParticipants: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Token inválido.");
        setLoading(false);
        return;
      }

      try {
        // Buscar status do sorteio
        const status = await getDrawStatus();
        setDrawStatus({
          isDrawn: status.isDrawn,
          totalParticipants: status.totalParticipants,
          unmatchedParticipants: status.unmatchedParticipants,
          minParticipants: status.minParticipants,
        });

        // Buscar dados do participante
        const response = await getParticipantByToken(token);
        setParticipant(response.participant);

        if (response.matchedParticipant) {
          setMatchedParticipant(response.matchedParticipant);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar dados do participante."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="participant-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="participant-container">
        <div className="participant-card" role="alert">
          <h1 className="participant-title">
            {error ? "Algo deu errado" : "Participante não encontrado"}
          </h1>
          <p className="participant-lead">
            {error ||
              "O link não é válido ou o participante não foi encontrado. Confira se copiou o link inteiro."}
          </p>
          <div className="result-actions">
            <button
              onClick={() => navigate("/")}
              className="action-button primary"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDrawComplete = drawStatus?.isDrawn ?? false;
  const hasMatch = matchedParticipant !== null;
  const showFireworks = isDrawComplete && hasMatch && revealed;

  // Quantos participantes já entram no próximo sorteio
  const waitingCount = drawStatus
    ? isDrawComplete
      ? drawStatus.unmatchedParticipants ?? drawStatus.totalParticipants
      : drawStatus.totalParticipants
    : 0;
  const missing = drawStatus ? drawStatus.minParticipants - waitingCount : 0;

  return (
    <div className="participant-container">
      <FireworksBackground
        active={showFireworks}
        fireworkSpeed={{ min: 8, max: 16 }}
        fireworkSize={{ min: 4, max: 10 }}
        particleSpeed={{ min: 4, max: 14 }}
        particleSize={{ min: 2, max: 10 }}
      />
      <div className="participant-card">
        <header className="participant-header">
          <img src="/logo.svg" alt="Rainha das Sete" className="brand-logo" />
          <h1 className="participant-title">Olá, {participant.name}!</h1>
          <p className="participant-lead">Seu resultado do Amigo Chocolate</p>
        </header>

        {!hasMatch ? (
          <section className="waiting-section" aria-live="polite">
            <h2 className="section-title">
              {isDrawComplete
                ? "Você ainda não foi sorteado"
                : "O sorteio ainda não saiu"}
            </h2>
            <p className="section-text">
              {isDrawComplete
                ? "Estamos aguardando mais participantes para fazer um novo sorteio. Guarde este link e volte mais tarde."
                : "Guarde este link e volte mais tarde para ver quem você tirou."}
            </p>
            {drawStatus && (
              <div className="status-info">
                <p className="status-count">
                  <strong>{waitingCount}</strong> de{" "}
                  <strong>{drawStatus.minParticipants}</strong> participantes
                  cadastrados
                </p>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={drawStatus.minParticipants}
                  aria-valuenow={Math.min(
                    waitingCount,
                    drawStatus.minParticipants
                  )}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        (waitingCount / drawStatus.minParticipants) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="progress-text">
                  {missing <= 0
                    ? "O sorteio sai em breve."
                    : `Faltam ${missing} ${
                        missing === 1 ? "participante" : "participantes"
                      }.`}
                </p>
              </div>
            )}
            <div className="result-actions">
              <button
                onClick={() => navigate("/")}
                className="action-button primary"
              >
                Voltar ao início
              </button>
            </div>
          </section>
        ) : (
          <section className="result-section" aria-live="polite">
            <div className={`wrapper-bar${revealed ? " is-open" : ""}`}>
              {revealed ? (
                <>
                  <p className="wrapper-label">Você tirou</p>
                  <div className="matched-name-mask">
                    <p className="matched-name">{matchedParticipant.name}</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="wrapper-closed-title">
                    Seu amigo chocolate está embrulhado
                  </h2>
                  <p className="wrapper-closed-text">
                    Abra quando estiver sozinho. Ninguém mais deve ver.
                  </p>
                  <button
                    onClick={() => setRevealed(true)}
                    className="action-button reveal"
                  >
                    Revelar meu amigo chocolate
                  </button>
                </>
              )}
            </div>

            {revealed && (
              <div className="reveal-details">
                {(matchedParticipant.preferredChocolate ||
                  matchedParticipant.dislikes) && (
                  <dl className="preferences">
                    {matchedParticipant.preferredChocolate && (
                      <div className="preference-item">
                        <dt>Chocolate preferido</dt>
                        <dd>{matchedParticipant.preferredChocolate}</dd>
                      </div>
                    )}
                    {matchedParticipant.dislikes && (
                      <div className="preference-item">
                        <dt>Não gosta de</dt>
                        <dd>{matchedParticipant.dislikes}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <p className="secret-reminder">
                  Segredo: não conte para ninguém quem você tirou.
                </p>

                <div className="result-actions">
                  <button
                    onClick={() => navigate("/")}
                    className="action-button primary"
                  >
                    Voltar ao início
                  </button>
                  <button
                    onClick={() => navigate("/regras")}
                    className="action-button secondary"
                  >
                    Ver regras
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Participant;
