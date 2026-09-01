/* A tiny string table. Not a full i18n stack: enough to prove the switch
 * works and to make adding a language a matter of filling in one map. */

export const LANGS: Record<string, string> = {
  en: "English",
  es: "Espanol",
};

type Dict = Record<string, string>;

const EN: Dict = {
  tagline: "a quiet duel on a shared grid",
  playBot: "Play a Bot",
  playBotSub: "a solo match against a critter trainer",
  playLocal: "Local 2-Player",
  playLocalSub: "pass one device back and forth, best of two",
  howto: "How to Play",
  howtoSub: "the rules in a minute",
  online: "Play a Friend",
  onlineSub: "share a room code, peer to peer",
  soon: "coming soon",
  dex: "Critterdex",
  chill: "Chill",
  sharp: "Sharp",
  difficulty: "Bot skill",
  keen: "Keen",
  fierce: "Fierce",
  record: "Record",
  streak: "Streak",
  rank: "Rank",
  ranked: "Ranked",
  rankedSub: "climb the 9-tier ladder vs a Fierce trainer",
  back: "Back to menu",
  startBot: "Face a bot",
  editName: "edit name",
};

const ES: Dict = {
  tagline: "un duelo tranquilo en una cuadricula compartida",
  playBot: "Jugar contra un Bot",
  playBotSub: "una partida en solitario contra un entrenador",
  playLocal: "2 Jugadores Local",
  playLocalSub: "pasad un dispositivo, al mejor de dos",
  howto: "Como Jugar",
  howtoSub: "las reglas en un minuto",
  online: "Jugar con un Amigo",
  onlineSub: "comparte un codigo de sala, P2P",
  soon: "proximamente",
  dex: "Critterdex",
  chill: "Tranquilo",
  sharp: "Agudo",
  difficulty: "Nivel del bot",
  keen: "Vivo",
  fierce: "Feroz",
  record: "Historial",
  streak: "Racha",
  rank: "Rango",
  ranked: "Clasificatoria",
  rankedSub: "sube la escalera de 9 niveles",
  back: "Volver al menu",
  startBot: "Enfrentar a un bot",
  editName: "editar nombre",
};

const TABLE: Record<string, Dict> = { en: EN, es: ES };

export function translator(lang: string) {
  const d = TABLE[lang] ?? EN;
  return (key: keyof typeof EN): string => d[key] ?? EN[key] ?? String(key);
}
