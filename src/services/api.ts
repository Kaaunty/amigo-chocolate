import axios, { type AxiosError } from "axios";
import type {
  RegisterParticipantRequest,
  RegisterParticipantResponse,
  ParticipantResponse,
  DrawStatus,
  AdminLoginRequest,
  AdminLoginResponse,
  UpdateMinParticipantsRequest,
  Participant,
} from "../types";

const ADMIN_TOKEN_KEY = "adminToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Injeta o Bearer do admin em toda requisicao, se houver token local.
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

// 401 em rota admin (exceto o proprio login): token invalido/expirado.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? "";
    const isAdminRoute = url.startsWith("/admin") && !url.startsWith("/admin/login");
    if (error.response?.status === 401 && isAdminRoute) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      throw new Error("Não autorizado");
    }
    return Promise.reject(error);
  }
);

// Função auxiliar para tratamento de erros
const handleError = (error: any): never => {
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage) {
    throw new Error(serverMessage);
  }
  if (error?.message) {
    throw new Error(error.message);
  }
  throw new Error("Erro desconhecido");
};

// Função auxiliar para verificar autenticação admin
const checkAdminAuth = (): string => {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!adminToken) {
    throw new Error("Não autorizado");
  }
  return adminToken;
};

// Funções de API

export const registerParticipant = async (
  data: RegisterParticipantRequest
): Promise<RegisterParticipantResponse> => {
  try {
    if (!data.name) {
      throw new Error("Nome é obrigatório");
    }

    const { data: result } = await api.post<RegisterParticipantResponse>(
      "/participants",
      {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        preferredChocolate: data.preferredChocolate?.trim() || undefined,
        dislikes: data.dislikes?.trim() || undefined,
      }
    );
    return result;
  } catch (error: any) {
    return handleError(error);
  }
};

export const getParticipantByToken = async (
  token: string
): Promise<ParticipantResponse> => {
  try {
    if (!token) {
      throw new Error("Token não fornecido");
    }

    const { data } = await api.get<ParticipantResponse>(
      `/participants/${encodeURIComponent(token)}`
    );
    return data;
  } catch (error: any) {
    return handleError(error);
  }
};

export const getAllParticipants = async (): Promise<Participant[]> => {
  try {
    checkAdminAuth();

    const { data } = await api.get<Participant[]>("/admin/participants");
    return data;
  } catch (error: any) {
    return handleError(error);
  }
};

export const getDrawStatus = async (): Promise<DrawStatus> => {
  try {
    const { data } = await api.get<DrawStatus>("/draw-status");
    return data;
  } catch (error: any) {
    return handleError(error);
  }
};

export const adminLogin = async (
  data: AdminLoginRequest
): Promise<AdminLoginResponse> => {
  try {
    if (!data.password) {
      return { success: false };
    }

    const { data: result } = await api.post<AdminLoginResponse>(
      "/admin/login",
      { password: data.password }
    );

    if (!result?.success || !result.token) {
      return { success: false };
    }

    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);

    return {
      success: true,
      token: result.token,
    };
  } catch (error: any) {
    return {
      success: false,
    };
  }
};

// Le a mensagem de erro quando a resposta veio como blob (ex.: export).
const readBlobErrorMessage = async (error: any): Promise<unknown> => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return { response: { data: parsed }, message: error.message };
    } catch {
      return error;
    }
  }
  return error;
};

export const exportParticipants = async (): Promise<Blob> => {
  try {
    checkAdminAuth();

    const { data } = await api.get<Blob>("/admin/export", {
      responseType: "blob",
    });
    return data;
  } catch (error: any) {
    return handleError(await readBlobErrorMessage(error));
  }
};

export const resetDraw = async (): Promise<void> => {
  try {
    checkAdminAuth();

    await api.post("/admin/reset");
  } catch (error: any) {
    return handleError(error);
  }
};

export const performDraw = async (): Promise<void> => {
  try {
    checkAdminAuth();

    // O backend dispara os e-mails apos o sorteio; falha de e-mail nao falha o sorteio.
    await api.post("/admin/draw");
  } catch (error: any) {
    return handleError(error);
  }
};

export const sendBatchEmails = async (): Promise<{
  success: boolean;
  results: any[];
  errors: any[];
  message: string;
}> => {
  try {
    checkAdminAuth();

    const { data } = await api.post<{
      success: boolean;
      results: any[];
      errors: any[];
      message: string;
    }>("/admin/send-emails");
    return data;
  } catch (error: any) {
    return handleError(error);
  }
};

export const testEmail = async (
  testEmailAddress: string
): Promise<{
  success: boolean;
  message: string;
  emailId?: string;
}> => {
  try {
    checkAdminAuth();

    const { data } = await api.post<{
      success: boolean;
      message: string;
      emailId?: string;
    }>("/admin/test-email", { email: testEmailAddress });
    return data;
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateMinParticipants = async (
  data: UpdateMinParticipantsRequest
): Promise<void> => {
  try {
    checkAdminAuth();

    if (!data.minParticipants || data.minParticipants < 2) {
      throw new Error("Número mínimo deve ser pelo menos 2");
    }

    await api.put("/admin/config", { minParticipants: data.minParticipants });
  } catch (error: any) {
    return handleError(error);
  }
};
