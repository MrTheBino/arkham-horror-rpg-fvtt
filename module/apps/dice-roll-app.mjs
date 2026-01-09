// ========================================================================
// Refactor v1 for DiceRollApp 
// As strictly UI gathering functions passing logic to SkillRollWorkflow with helper functions can then be extended for other roll types/dialogs/chat activation buttons etc..
// Injury/Trauma, Rerolls, d3 rolls.
// ========================================================================

import { SkillRollWorkflow } from "../rolls/skill-roll-workflow.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class DiceRollApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);

    this.actor = options.actor;
    this.skillKey = options.skillKey;
    this.skillCurrent = options.skillCurrent;
    this.skillMax = options.skillMax;
    this.currentDicePool = options.currentDicePool;

    // Single canonical "book" of parameters
    // (UI template context reads from here; workflow reads from here)
    this.rollState = {
        skillKey: this.skillKey,
        skillCurrent: this.skillCurrent,
        skillMax: this.skillMax,
        currentDicePool: this.currentDicePool,

        diceToUse: 0,
        penalty: 0,
        bonusDice: 0,
        successesNeeded: 0,

        rollWithAdvantage: false,
        rollWithDisadvantage: false,
    };

    DiceRollApp.instance = this;
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "dice-roll-app",
    classes: ["dialog", "dice-roll-app"],
    tag: "div",
    window: {
        frame: true,
        title: "Dice Roll",
        icon: "fa-solid fa-book-atlas",
        positioned: true,
        resizable: true,
    },
    position: {
        width: 400,
        height: 450,
    },
    actions: {
        clickedRoll: this.#handleClickedRoll,
    },
  };

  /** @override */
  static PARTS = {
    dialog: {
        template: "systems/arkham-horror-rpg-fvtt/templates/dice-roll-app/dialog.hbs",
        scrollable: [""],
    },
  };

  setOptions(options = {}) {
    if (options.actor) this.actor = options.actor;
    if (options.skillKey) this.skillKey = options.skillKey;
    if (options.skillCurrent !== undefined) this.skillCurrent = options.skillCurrent;
    if (options.skillMax !== undefined) this.skillMax = options.skillMax;
    if (options.currentDicePool !== undefined) this.currentDicePool = options.currentDicePool;

    // Keep rollState in sync (single book)
    this.rollState.skillKey = this.skillKey;
    this.rollState.skillCurrent = this.skillCurrent;
    this.rollState.skillMax = this.skillMax;
    this.rollState.currentDicePool = this.currentDicePool;

    // Reset transient roll modifiers like your original code
    this.rollState.rollWithAdvantage = false;
    this.rollState.rollWithDisadvantage = false;
    this.rollState.diceToUse = 0;
    this.rollState.bonusDice = 0;
    this.rollState.penalty = 0;
    this.rollState.successesNeeded = 0;
  }

  static getInstance(options = {}) {
    if (!DiceRollApp.instance) {
        DiceRollApp.instance = new DiceRollApp(options);
    }
    const instance = DiceRollApp.instance;
    instance.setOptions(options);
    return instance;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Feed template from rollState (no separate context mapping logic)
    return {
        ...context,

        actor: this.actor,
        skillKey: this.rollState.skillKey,
        skillCurrent: this.rollState.skillCurrent,
        skillMax: this.rollState.skillMax,
        currentDicePool: this.rollState.currentDicePool,
        diceToUse: this.rollState.diceToUse,
        penalty: this.rollState.penalty,
        bonus_dice: this.rollState.bonusDice, // bonus_dice match form field name so this populates 0 correctly now
        successesNeeded: this.rollState.successesNeeded,
        rollWithAdvantage: this.rollState.rollWithAdvantage,
        rollWithDisadvantage: this.rollState.rollWithDisadvantage,
    };
  }

  static async #handleClickedRoll(event, target) {
    this.clickedRollCallback(event, target);
  }

  async clickedRollCallback(event, target) {
    event.preventDefault();
    const form = target.form;

    // Update rollState FROM UI once
    this.rollState.skillCurrent = Number.parseInt(form.skillCurrent.value) || 0;
    this.rollState.diceToUse = Number.parseInt(form.diceToUse.value) || 0;
    this.rollState.penalty = Number.parseInt(form.penalty.value) || 0;
    this.rollState.bonusDice = Number.parseInt(form.bonus_dice.value) || 0;
    this.rollState.successesNeeded = Number.parseInt(form.difficulty.value) || 0;

    // Advantage / disadvantage selector logic (same as original intent)
    const modifierAdvantage = Number.parseInt(form.advantageModifier.value) || 0;
    if (modifierAdvantage === 1) {
        this.rollState.rollWithAdvantage = true;
        this.rollState.rollWithDisadvantage = false;
    } else if (modifierAdvantage === 2) {
        this.rollState.rollWithDisadvantage = true;
        this.rollState.rollWithAdvantage = false;
    } else if (modifierAdvantage === 3) {
        this.rollState.rollWithAdvantage = true;
        this.rollState.rollWithDisadvantage = true;
    } else {
        this.rollState.rollWithAdvantage = false;
        this.rollState.rollWithDisadvantage = false;
    }

    // If Adv/Disadv selected, you must be rolling at least 1 die
    const baseDice = (this.rollState.diceToUse || 0) + (this.rollState.bonusDice || 0);
    if (modifierAdvantage !== 0 && baseDice <= 0) {
        ui.notifications.warn("Advantage/Disadvantage requires rolling at least 1 die.");
        return; // keep dialog open
    } else if (baseDice <= 0) {
        ui.notifications.warn("You must roll at least 1 die.");
        return; // keep dialog open
    }
    
    // Run workflow end-to-end (roll + update actor + post chat)
    const workflow = new SkillRollWorkflow();
    await workflow.run({ actor: this.actor, state: this.rollState });

    this.close();
  }
}