export interface Participant {
  id: string;
  name: string;
  email: string;
  token: string;
  createdAt: string;
  matchedWith?: string; // ID do amigo chocolate
  matchedWithName?: string; // Nome do amigo chocolate (para facilitar exibição)
  preferredChocolate?: string; // Chocolate preferido
  dislikes?: string; // O que não gosta
}

export interface DrawStatus {
  isDrawn: boolean;
  totalParticipants: number;
  unmatchedParticipants?: number; // Número de participantes sem match
  minParticipants: number;
  canDraw: boolean;
}

export interface AdminConfig {
  minParticipants: number;
}

export interface RegisterParticipantRequest {
  name: string;
  email: string;
  preferredChocolate?: string;
  dislikes?: string;
}

export interface RegisterParticipantResponse {
  participant: Participant;
  link: string;
}

// Dados do par expostos publicamente (sem token, e-mail ou vínculo do par)
export type MatchedParticipant = Pick<
  Participant,
  "id" | "name" | "preferredChocolate" | "dislikes"
>;

export interface ParticipantResponse {
  participant: Participant;
  matchedParticipant?: MatchedParticipant;
}

export interface AdminLoginRequest {
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
}

export interface UpdateMinParticipantsRequest {
  minParticipants: number;
}

