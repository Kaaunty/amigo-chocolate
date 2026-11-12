// Formato de participante exposto pela API (camelCase), igual a src/types/index.ts.
export interface Participant {
  id: string;
  name: string;
  email: string;
  token: string;
  createdAt: string;
  matchedWith?: string;
  matchedWithName?: string;
  preferredChocolate?: string;
  dislikes?: string;
}

// Linha da tabela participants (snake_case). Colunas opcionais quando a query nao as seleciona.
export interface ParticipantRow {
  id: string;
  name: string;
  email: string | null;
  token: string;
  created_at: string;
  matched_with?: string | null;
  preferred_chocolate?: string | null;
  dislikes?: string | null;
}

export interface ParticipantExtras {
  matchedWith?: string;
  matchedWithName?: string;
}

// Converte uma linha do SQLite em Participant.
// Campos nulos/vazios sao omitidos (equivalente ao `|| undefined` do front).
// `extras` permite sobrescrever matchedWith (ex.: no par, aponta para o participante atual)
// e informar matchedWithName, que nao existe na tabela.
export function toParticipant(row: ParticipantRow, extras?: ParticipantExtras): Participant {
  const participant: Participant = {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    token: row.token,
    createdAt: row.created_at,
  };

  const matchedWith = extras?.matchedWith ?? row.matched_with;
  if (matchedWith) participant.matchedWith = matchedWith;
  if (extras?.matchedWithName) participant.matchedWithName = extras.matchedWithName;
  if (row.preferred_chocolate) participant.preferredChocolate = row.preferred_chocolate;
  if (row.dislikes) participant.dislikes = row.dislikes;

  return participant;
}
