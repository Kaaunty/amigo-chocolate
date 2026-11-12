import { useState, useEffect } from "react";
import {
  getAllParticipants,
  getDrawStatus,
  updateMinParticipants,
  resetDraw,
  performDraw,
  exportParticipants,
  sendBatchEmails,
} from "../services/api";
import AdminLogin from "../components/AdminLogin";
import LoadingSpinner from "../components/LoadingSpinner";
import { useDialog } from "../hooks/useDialog";
import type { Participant, DrawStatus } from "../types";
import "./Admin.css";

const Admin = () => {
  const { confirm, alert, dialog } = useDialog();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [drawStatus, setDrawStatus] = useState<DrawStatus | null>(null);
  const [minParticipants, setMinParticipants] = useState(5);
  const [updatingMin, setUpdatingMin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [performingDraw, setPerformingDraw] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Verificar se já está autenticado
    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      setIsAuthenticated(true);
      loadData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- executa só na montagem
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [participantsData, statusData] = await Promise.all([
        getAllParticipants(),
        getDrawStatus(),
      ]);
      setParticipants(participantsData);
      setDrawStatus(statusData);
      setMinParticipants(statusData.minParticipants);
    } catch (err) {
      handleApiError(err, "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setParticipants([]);
    setDrawStatus(null);
  };

  // Define a mensagem de erro e desautentica quando a API responde 401
  const handleApiError = (err: unknown, fallbackMsg: string) => {
    setError(err instanceof Error ? err.message : fallbackMsg);
    if (
      err instanceof Error &&
      (err.message === "Não autorizado" || err.message.includes("401"))
    ) {
      handleLogout();
    }
  };

  const handleUpdateMinParticipants = async () => {
    if (minParticipants < 2) {
      setError("O número mínimo deve ser pelo menos 2.");
      return;
    }

    try {
      setUpdatingMin(true);
      setError("");
      await updateMinParticipants({ minParticipants });
      await loadData();
    } catch (err) {
      handleApiError(err, "Erro ao atualizar configuração.");
    } finally {
      setUpdatingMin(false);
    }
  };

  const handlePerformDraw = async () => {
    if (
      !(await confirm({
        title: "Realizar sorteio",
        message:
          "Tem certeza que deseja realizar o sorteio agora? Os emails serão enviados automaticamente para todos os participantes.",
        confirmLabel: "Realizar sorteio",
      }))
    ) {
      return;
    }

    try {
      setPerformingDraw(true);
      setError("");
      await performDraw();
      await loadData();
      await alert({
        title: "Sorteio realizado",
        message:
          "Sorteio realizado com sucesso! Os emails foram enviados automaticamente para todos os participantes.",
        tone: "success",
      });
    } catch (err) {
      handleApiError(err, "Erro ao realizar sorteio.");
    } finally {
      setPerformingDraw(false);
    }
  };

  const handleResetDraw = async () => {
    if (
      !(await confirm({
        title: "Reiniciar sorteio",
        message:
          "Tem certeza que deseja reiniciar o sorteio? Esta ação não pode ser desfeita.",
        tone: "danger",
        confirmLabel: "Reiniciar",
      }))
    ) {
      return;
    }

    try {
      setResetting(true);
      setError("");
      await resetDraw();
      await loadData();
      await alert({
        title: "Sorteio reiniciado",
        message: "Sorteio reiniciado com sucesso!",
        tone: "success",
      });
    } catch (err) {
      handleApiError(err, "Erro ao reiniciar sorteio.");
    } finally {
      setResetting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      setError("");
      const blob = await exportParticipants();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participantes-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      handleApiError(err, "Erro ao exportar CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmails = async () => {
    if (!drawStatus?.isDrawn) {
      await alert({
        title: "Sorteio pendente",
        message: "O sorteio ainda não foi realizado. Realize o sorteio primeiro.",
        tone: "error",
      });
      return;
    }

    if (
      !(await confirm({
        title: "Enviar e-mails",
        message:
          "Deseja enviar emails para todos os participantes? Esta ação enviará emails para todos que foram sorteados.",
        confirmLabel: "Enviar e-mails",
      }))
    ) {
      return;
    }

    try {
      setSendingEmails(true);
      setError("");
      const result = await sendBatchEmails();

      if (result.success) {
        const successCount = result.results?.length || 0;
        const errorCount = result.errors?.length || 0;
        await alert({
          title: "E-mails enviados",
          message: `Emails enviados com sucesso!\n${successCount} emails enviados${
            errorCount > 0 ? `\n${errorCount} erros` : ""
          }`,
          tone: errorCount > 0 ? "error" : "success",
        });
      } else {
        throw new Error(result.message || "Erro ao enviar emails");
      }
    } catch (err) {
      handleApiError(err, "Erro ao enviar emails.");
    } finally {
      setSendingEmails(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <AdminLogin onSuccess={handleLoginSuccess} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <LoadingSpinner />
      </div>
    );
  }

  const total = drawStatus?.totalParticipants ?? 0;
  const minimum = drawStatus?.minParticipants ?? 5;

  return (
    <div className="admin-container">
      <div className="admin-content">
        <header className="admin-header">
          <div className="admin-brand">
            <img src="/logo.svg" alt="Rainha das Sete" className="brand-logo" />
            <h1 className="admin-title">Painel administrativo</h1>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </header>

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}

        <section className="admin-summary" aria-label="Resumo do sorteio">
          <div className="summary-item summary-main">
            <span className="summary-value">{total}</span>
            <span className="summary-label">
              {total === 1 ? "participante cadastrado" : "participantes cadastrados"}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-value">{minimum}</span>
            <span className="summary-label">mínimo para sortear</span>
          </div>
          <div className="summary-item">
            <span className="summary-value summary-status">
              {drawStatus?.isDrawn ? "Realizado" : "Pendente"}
            </span>
            <span className="summary-label">status do sorteio</span>
          </div>
        </section>

        <div className="admin-columns">
          <div className="admin-side">
            <section className="admin-section" aria-labelledby="titulo-acoes">
              <h2 id="titulo-acoes" className="section-title">
                Ações
              </h2>
              <div className="actions-list">
                {!drawStatus?.isDrawn && drawStatus?.canDraw && (
                  <button
                    onClick={handlePerformDraw}
                    disabled={performingDraw}
                    className="action-card primary"
                  >
                    {performingDraw
                      ? "Realizando sorteio..."
                      : "Realizar sorteio"}
                  </button>
                )}
                {drawStatus?.isDrawn && (
                  <button
                    onClick={handleSendEmails}
                    disabled={sendingEmails || participants.length === 0}
                    className="action-card email"
                  >
                    {sendingEmails ? "Enviando e-mails..." : "Enviar e-mails"}
                  </button>
                )}
                <button
                  onClick={handleExportCSV}
                  disabled={exporting || participants.length === 0}
                  className="action-card"
                >
                  {exporting ? "Exportando..." : "Exportar CSV"}
                </button>
                <button
                  onClick={handleResetDraw}
                  disabled={resetting}
                  className="action-card danger"
                >
                  {resetting ? "Reiniciando..." : "Reiniciar sorteio"}
                </button>
              </div>
            </section>

            <section className="admin-section" aria-labelledby="titulo-config">
              <h2 id="titulo-config" className="section-title">
                Configurações
              </h2>
              <div className="config-item">
                <label htmlFor="minParticipants" className="config-label">
                  Mínimo de participantes
                </label>
                <div className="config-input-group">
                  <input
                    type="number"
                    id="minParticipants"
                    className="config-input"
                    value={minParticipants}
                    onChange={(e) =>
                      setMinParticipants(parseInt(e.target.value) || 2)
                    }
                    min="2"
                  />
                  <button
                    onClick={handleUpdateMinParticipants}
                    disabled={updatingMin}
                    className="config-button"
                  >
                    {updatingMin ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section
            className="admin-section admin-participants"
            aria-labelledby="titulo-participantes"
          >
            <h2 id="titulo-participantes" className="section-title">
              Participantes
              <span className="section-count">{participants.length}</span>
            </h2>
            {participants.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">Nenhum participante ainda.</p>
                <p>
                  Compartilhe o link da página inicial para as pessoas se
                  cadastrarem.
                </p>
              </div>
            ) : (
              <ul className="participants-list">
                {participants.map((participant) => (
                  <li key={participant.id} className="participant-item">
                    <div className="participant-name">{participant.name}</div>
                    {participant.email && (
                      <div className="participant-email">
                        {participant.email}
                      </div>
                    )}
                    <div className="participant-token">
                      Token <code>{participant.token}</code>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {dialog}
    </div>
  );
};

export default Admin;
