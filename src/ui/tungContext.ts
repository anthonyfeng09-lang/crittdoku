import { createContext, useContext } from "react";
import { ROSTER, type CreatureId } from "../engine";
import { tungName } from "./tung";

/* Whether the cosmetic TUNGIFY reskin is on. Provided once at the App root
 * from profile.tungified; read anywhere a critter is drawn or named. */
export const TungContext = createContext(false);
export const useTung = () => useContext(TungContext);

/** critter's display name for the current skin */
export function dispName(id: CreatureId, tung: boolean): string {
  return tung ? tungName(id) : ROSTER[id].name;
}
