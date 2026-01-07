import { 
    rollD6, 
    calculatePoolsAndThresholds,
    collectTaggedResults,
    applyAdvantageDisadvantageDrop,
    computeSkillOutcome,
    applyDicepoolCost,
} from "../helpers/roll-engine.mjs";
import { renderChatHtml, postChatMessage } from "../helpers/chat-utils.mjs";


export class SkillRollWorkflow {
  async plan({ actor, state }) {
    // produce a plan identical to the old DiceRollService internal calculations
    return calculatePoolsAndThresholds({
      actor,
      skillCurrent: state.skillCurrent,
      currentDicePool: state.currentDicePool,
      diceToUse: state.diceToUse,
      penalty: state.penalty,
      bonusDice: state.bonusDice,
      rollWithAdvantage: state.rollWithAdvantage,
      rollWithDisadvantage: state.rollWithDisadvantage,
    });
  }

  async execute({ actor, state, plan }) {
    // roll horror separately (so we can render separate HTML and tag)
    const horror = plan.horrorDiceToRoll > 0
      ? await rollD6({ actor, numDice: plan.horrorDiceToRoll })
      : null;

    const normal = await rollD6({ actor, numDice: plan.diceToRoll });

    return { normal, horror };
  }

  computeOutcome({ actor, state, plan, exec }) {
    const diceRollResults = collectTaggedResults({
      normalResults: exec.normal.results,
      horrorResults: exec.horror ? exec.horror.results : [],
    });

    
    applyAdvantageDisadvantageDrop(diceRollResults, {
      rollWithAdvantage: plan.rollWithAdvantage,
      rollWithDisadvantage: plan.rollWithDisadvantage,
    });

    const outcome = computeSkillOutcome(diceRollResults, {
      successOn: plan.successOn,
      penalty: plan.penalty,
      successesNeeded: state.successesNeeded,
    });

    return {
      ...outcome,
      successOn: plan.successOn,
      diceToUse: plan.diceToUse,
      horrorDiceToRoll: plan.horrorDiceToRoll,
      penalty: plan.penalty,
      bonusDice: plan.bonusDice,
      successesNeeded: Number.parseInt(state.successesNeeded) || 0,
      rollWithAdvantage: plan.rollWithAdvantage,
      rollWithDisadvantage: plan.rollWithDisadvantage,
      horrorDiceUsed: plan.horrorDiceToRoll > 0,
      diceRollHTML: exec.normal.html,
      horrorDiceRollHTML: exec.horror ? exec.horror.html : "",
    };
  }

  async applyEffects({ actor, state, plan, exec, outcome }) {
    // subtract used dice from actor's dicepool
    const dicepoolDelta = await applyDicepoolCost(actor, outcome.diceToUse);
    outcome.oldDicePoolValue = dicepoolDelta.oldDicePoolValue;
    outcome.newDicePoolValue = dicepoolDelta.newDicePoolValue;
  }

  buildChat({ actor, state, plan, exec, outcome }) {
    const template = "systems/arkham-horror-rpg-fvtt/templates/chat/roll-result.hbs";

    const chatData = {
      diceRollHTML: outcome.diceRollHTML,
      horrorDiceRollHTML: outcome.horrorDiceRollHTML,
      successOn: outcome.successOn,
      diceToUse: outcome.diceToUse,
      results: outcome.finalDiceRollResults,
      successCount: outcome.successCount,
      failureCount: outcome.failureCount,
      skillUsed: game.i18n.localize(`ARKHAM_HORROR.SKILL.${state.skillKey}`),
      newDicePoolValue: outcome.newDicePoolValue,
      oldDicePoolValue: outcome.oldDicePoolValue,
      horrorFailureCount: outcome.horrorFailureCount,
      horrorDiceToRoll: outcome.horrorDiceToRoll,
      isSuccess: outcome.isSuccess,
      penalty: outcome.penalty,
      bonusDice: outcome.bonusDice,
      successesNeeded: outcome.successesNeeded,
      rollWithAdvantage: outcome.rollWithAdvantage,
      rollWithDisadvantage: outcome.rollWithDisadvantage,
      horrorDiceUsed: outcome.horrorDiceUsed,
    };

    return { template, chatData };
  }

  async post({ actor, state, plan, exec, outcome }) {
    const { template, chatData } = this.buildChat({ actor, state, plan, exec, outcome });
    const html = await renderChatHtml(template, chatData);
    const message = await postChatMessage({ actor, html });
    return { html, message, chatData };
  }

  /**
   * Convenience method: run end-to-end without an external orchestrator.
   * (Optional; remove if you prefer a shared RollOrchestrator.)
   */
  async run({ actor, state }) {
    const plan = await this.plan({ actor, state });
    const exec = await this.execute({ actor, state, plan });
    const outcome = this.computeOutcome({ actor, state, plan, exec });
    await this.applyEffects({ actor, state, plan, exec, outcome });
    const posted = await this.post({ actor, state, plan, exec, outcome });
    return { plan, exec, outcome, ...posted };
  }
}