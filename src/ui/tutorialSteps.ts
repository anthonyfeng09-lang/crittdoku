import type { CoachStep } from "./Coach";
import type { T } from "./i18n";

/* The scripted walkthrough for the interactive tutorial. Each step points the
 * spotlight at a real element on the live screen. Action steps wait on a DOM
 * condition (a pick was made, a digit was placed) so the player actually does
 * the thing before moving on. */

const filledCells = () =>
  [...document.querySelectorAll(".board .cell")].filter(
    (c) =>
      /[1-9]/.test((c.textContent || "").trim()) &&
      !c.classList.contains("seeded"),
  ).length;

export function tutorialSteps(t: T): CoachStep[] {
  // baselines captured lazily the first time a gate is checked
  let placeBase: number | null = null;

  return [
    {
      title: t("tut_welcomeTitle"),
      body: t("tut_welcomeBody"),
      place: "center",
    },
    {
      target: ".meadow-stage",
      title: t("tut_poolTitle"),
      body: t("tut_poolBody"),
      place: "center",
      interact: true,
      noNext: true,
      pad: 6,
      until: () =>
        document.querySelectorAll(".tray-slot.filled").length >= 1,
    },
    {
      target: ".pool-reroll",
      title: t("tut_rerollTitle"),
      body: t("tut_rerollBody"),
      place: "top",
    },
    {
      target: ".meadow-tokens",
      title: t("tut_energyTitle"),
      body: t("tut_energyBody"),
      place: "bottom",
    },
    {
      target: ".draftstrip",
      title: t("tut_trayTitle"),
      body: t("tut_trayBody"),
      place: "bottom",
      pad: 4,
    },
    {
      target: ".meadow-stage",
      title: t("tut_fillTitle"),
      body: t("tut_fillBody"),
      place: "center",
      interact: true,
      noNext: true,
      pad: 6,
      until: () =>
        !!document.querySelector(".stage.assign, .stage.play"),
    },
    {
      target: '[data-coach="start"]',
      title: t("tut_startTitle"),
      body: t("tut_startBody"),
      place: "top",
      interact: true,
      noNext: true,
      until: () => !!document.querySelector(".stage.play"),
    },
    {
      target: ".board",
      title: t("tut_boardTitle"),
      body: t("tut_boardBody"),
      place: "right",
      pad: 6,
    },
    {
      target: ".board",
      title: t("tut_placeTitle"),
      body: t("tut_placeBody"),
      place: "right",
      interact: true,
      noNext: true,
      pad: 6,
      until: () => {
        if (placeBase === null) placeBase = filledCells();
        return filledCells() > placeBase;
      },
    },
    {
      target: ".info-col .panel",
      title: t("tut_holdTitle"),
      body: t("tut_holdBody"),
      place: "left",
    },
    {
      target: ".abilities",
      title: t("tut_abilityTitle"),
      body: t("tut_abilityBody"),
      place: "left",
    },
    {
      target: ".panel.team",
      title: t("tut_teamTitle"),
      body: t("tut_teamBody"),
      place: "left",
    },
    {
      title: t("tut_doneTitle"),
      body: t("tut_doneBody"),
      place: "center",
    },
  ];
}
