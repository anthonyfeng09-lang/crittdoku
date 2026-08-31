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
  online: "Online & Party",
  onlineSub: "friends and 3-player, coming soon",
  soon: "coming soon",
  dex: "Critterdex",
  chill: "Chill",
  sharp: "Sharp",
  difficulty: "Bot skill",
  record: "Record",
  streak: "Streak",
  rank: "Rank",
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
  online: "En linea y Fiesta",
  onlineSub: "amigos y 3 jugadores, proximamente",
  soon: "proximamente",
  dex: "Critterdex",
  chill: "Tranquilo",
  sharp: "Agudo",
  difficulty: "Nivel del bot",
  record: "Historial",
  streak: "Racha",
  rank: "Rango",
  back: "Volver al menu",
  startBot: "Enfrentar a un bot",
  editName: "editar nombre",
};

const TABLE: Record<string, Dict> = { en: EN, es: ES };

export function translator(lang: string) {
  const d = TABLE[lang] ?? EN;
  return (key: keyof typeof EN): string => d[key] ?? EN[key] ?? String(key);
}
