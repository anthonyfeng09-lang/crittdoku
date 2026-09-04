import { useTung } from "./tungContext";

/* The wordmark. CRITTDOKU normally; TUNG³DOKU under the reskin. `home` is the
 * big rainbow one on the menu, otherwise the small appbar one. */
export function Mark({ home = false }: { home?: boolean }) {
  const tung = useTung();
  const cls = home ? "home-wordmark" : undefined;
  if (tung)
    return home ? (
      <h1 className="home-wordmark tung-wordmark">
        TUNG<sup>3</sup>DOKU
      </h1>
    ) : (
      <h1 className="tung-wordmark">
        TUNG<sup>3</sup>DOKU
      </h1>
    );
  return <h1 className={cls}>CRITTDOKU</h1>;
}
