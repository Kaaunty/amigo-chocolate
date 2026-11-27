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
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          "Tem certeza que deseja realizar o sorteio agora? Os e-mails não são enviados automaticamente: depois do sorteio, envie-os manualmente.",
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
          "Sorteio realizado com sucesso! Agora envie os e-mails para os participantes.",
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
  const isDrawn = Boolean(drawStatus?.isDrawn);
  const canDraw = Boolean(drawStatus?.canDraw);
  const stage: "cadastro" | "sorteio" | "emails" = isDrawn
    ? "emails"
    : canDraw
      ? "sorteio"
      : "cadastro";
  const missing = Math.max(0, minimum - total);

  const steps = [
    {
      id: "cadastro",
      title: "Cadastro",
      detail: `${total} cadastrados, mínimo ${minimum}`,
      done: stage !== "cadastro",
    },
    {
      id: "sorteio",
      title: "Sorteio",
      detail: isDrawn ? "Realizado" : "Pendente",
      done: isDrawn,
    },
    {
      id: "emails",
      title: "E-mails",
      detail: isDrawn ? "Disparados no sorteio" : "Saem com o sorteio",
      done: isDrawn,
    },
  ] as const;

  const headline = {
    cadastro:
      missing === 1
        ? "Falta 1 participante para sortear"
        : `Faltam ${missing} participantes para sortear`,
    sorteio: "Tudo pronto para sortear",
    emails: "Sorteio realizado",
  }[stage];

  const subline = {
    cadastro: "Compartilhe o link da página inicial para as pessoas se cadastrarem.",
    sorteio: `${total} participantes cadastrados. Os e-mails são enviados manualmente depois do sorteio.`,
    emails:
      "O sorteio foi feito, mas os e-mails ainda não são enviados automaticamente. Envie-os para que cada um receba seu link.",
  }[stage];

  const query = search.trim().toLowerCase();
  const visibleParticipants = query
    ? participants.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.email ?? "").toLowerCase().includes(query),
      )
    : participants;

  const handleCopyLink = async (participant: Participant) => {
    const link = `${window.location.origin}/participante/${participant.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(participant.id);
      window.setTimeout(
        () => setCopiedId((current) => (current === participant.id ? null : current)),
        2000,
      );
    } catch {
      await alert({
        title: "Não foi possível copiar",
        message: link,
        tone: "error",
      });
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-title">Painel administrativo</h1>
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </header>

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}

        <section className="admin-stage" aria-labelledby="titulo-etapa">
          <ol className="stage-steps">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={`stage-step${step.done ? " is-done" : ""}${
                  step.id === stage ? " is-current" : ""
                }`}
                aria-current={step.id === stage ? "step" : undefined}
              >
                <span className="stage-step-mark" aria-hidden="true">
                  {step.done ? "✓" : index + 1}
                </span>
                <span className="stage-step-title">{step.title}</span>
                <span className="stage-step-detail">{step.detail}</span>
              </li>
            ))}
          </ol>

          <div className="stage-body">
            <div className="stage-text">
              <h2 id="titulo-etapa" className="stage-headline">
                {headline}
              </h2>
              <p className="stage-subline">{subline}</p>
            </div>
            {stage === "sorteio" && (
              <button
                onClick={handlePerformDraw}
                disabled={performingDraw}
                className="stage-action"
              >
                {performingDraw ? "Realizando sorteio..." : "Realizar sorteio"}
              </button>
            )}
            {stage === "emails" && (
              <button
                onClick={handleSendEmails}
                disabled={sendingEmails || participants.length === 0}
                className="stage-action"
              >
                {sendingEmails ? "Enviando e-mails..." : "Enviar e-mails"}
              </button>
            )}
          </div>
        </section>

        <div className="admin-columns">
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
              <>
                <div className="participants-search">
                  <label htmlFor="busca" className="visually-hidden">
                    Buscar participante
                  </label>
                  <input
                    id="busca"
                    type="search"
                    className="config-input"
                    placeholder="Buscar por nome ou e-mail"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {visibleParticipants.length === 0 ? (
                  <p className="empty-state">
                    Nenhum participante encontrado para “{search.trim()}”.
                  </p>
                ) : (
                  <ul
                    className="participants-list"
                    tabIndex={0}
                    aria-label="Lista de participantes"
                  >
                    {visibleParticipants.map((participant) => (
                      <li key={participant.id} className="participant-item">
                        <div className="participant-info">
                          <div className="participant-name">
                            {participant.name}
                          </div>
                          {participant.email && (
                            <div className="participant-email">
                              {participant.email}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="copy-link"
                          onClick={() => handleCopyLink(participant)}
                          aria-label={`Copiar link de ${participant.name}`}
                        >
                          {copiedId === participant.id
                            ? "Link copiado"
                            : "Copiar link"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <div className="admin-side">
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

            <section className="admin-section" aria-labelledby="titulo-dados">
              <h2 id="titulo-dados" className="section-title">
                Dados
              </h2>
              <div className="actions-list">
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
          </div>
        </div>
      </div>
      {dialog}
    </div>
  );
};

export default Admin;
