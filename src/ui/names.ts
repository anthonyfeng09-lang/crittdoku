/* Plausible-looking handles for a queue match that quietly fell back to a bot,
 * so it doesn't read as "Fierce bot". Nature-ish, lowercase, sometimes a
 * number or a trailing initial - the way people actually pick handles. */

const A = [
  "moss",
  "fern",
  "cedar",
  "willow",
  "bramble",
  "thistle",
  "clover",
  "birch",
  "reed",
  "dusk",
  "quiet",
  "amber",
  "hollow",
  "pebble",
  "drift",
  "slate",
  "hazel",
  "juniper",
  "sage",
  "wren",
];
const B = [
  "fox",
  "jay",
  "newt",
  "lark",
  "vole",
  "moth",
  "hare",
  "pike",
  "owl",
  "toad",
  "crow",
  "elk",
  "roe",
  "finch",
  "otter",
  "shrew",
];

export function randomHandle(): string {
  const r = Math.random();
  const base =
    r < 0.4
      ? A[(Math.random() * A.length) | 0] + B[(Math.random() * B.length) | 0]
      : r < 0.7
        ? B[(Math.random() * B.length) | 0] +
          (10 + ((Math.random() * 89) | 0))
        : A[(Math.random() * A.length) | 0] +
          "_" +
          "abcdefghjkmnp"[(Math.random() * 13) | 0];
  return base;
}
