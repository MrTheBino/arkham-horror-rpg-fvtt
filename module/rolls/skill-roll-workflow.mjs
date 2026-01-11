import { 
    rollD6, 
    calculatePoolsAndThresholds,
    collectTaggedResults,
    applyAdvantageDisadvantageDrop,
    computeSkillOutcome,
    applyDicepoolCost,
} from "../helpers/roll-engine.mjs";
import { createArkhamHorrorChatCard } from "../util/chat-utils.mjs";


export class SkillRollWorkflow {
  async plan({ actor, state }) {
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

  async execute({ actor, plan }) {
    // roll horror separately (so we can render separate HTML and tag)
    const dicePromises = [];
    const horror = plan.horrorDiceToRoll > 0
      ? await rollD6({ actor, numDice: plan.horrorDiceToRoll, dicePromises })
      : null;

    const normal = await rollD6({ actor, numDice: plan.diceToRoll, dicePromises });
    
    await Promise.all(dicePromises);
    return { normal, horror };
  }

  processWeapon({ state, outcome }) {
    // Implement weapon-specific logic here
    // if there are any success return the damage
    let result = {weaponUsageSuccess : false,weaponAmmoUsed: false};
    if (state.weaponToUse) {
      
      if (outcome.successCount > 0) {
        result.weaponUsageSuccess = true;
        result.weaponDamage = state.weaponToUse.system.damage;
      }else{
        result.weaponDamage = 0;
      }
      if(outcome.successCount >= state.weaponToUse.system.injuryRating && state.weaponToUse.system.injuryRating > 0){
        result.weaponInflictInjury = true;
      }
      result.weaponSpecialRules = state.weaponToUse.system.specialRules;
      result.weaponUsed = state.weaponToUse;

      //page 81 core rule book, if the final dice roll includes a 1, you expend one ammo
      // TODO: check for special rules in the future
      if(outcome.finalDiceRollResults.some(r => r.result === 1)){
        if(state.weaponToUse.system.ammunition.max > 0){
          state.weaponToUse.system.ammunition.current = Math.max(0, state.weaponToUse.system.ammunition.current - 1);
          result.weaponAmmoUsed = true;
          // update item
          state.weaponToUse.update({"system.ammunition.current": state.weaponToUse.system.ammunition.current});
          console.log("decreased ammo for weapon" + state.weaponToUse.name);
        }
      }
    }else{
      result.weaponUsed = false;
    }

    return result;
  }

  computeOutcome({ state, plan, exec }) {
    const diceRollResults = collectTaggedResults({
      normalResults: exec.normal.results,
      horrorResults: exec.horror ? exec.horror.results : [],
    });

    
    applyAdvantageDisadvantageDrop(diceRollResults, {
      rollWithAdvantage: plan.rollWithAdvantage,
      rollWithDisadvantage: plan.rollWithDisadvantage,
    });

    let outcome = computeSkillOutcome(diceRollResults, {
      successOn: plan.successOn,
      penalty: plan.penalty,
      successesNeeded: state.successesNeeded,
    });

    outcome = { ...outcome, ...this.processWeapon({ state, outcome }) };


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

  async applyEffects({ actor, outcome }) {
    // subtract used dice from actor's dicepool
    const dicepoolDelta = await applyDicepoolCost(actor, outcome.diceToUse);
    outcome.oldDicePoolValue = dicepoolDelta.oldDicePoolValue;
    outcome.newDicePoolValue = dicepoolDelta.newDicePoolValue;
  }

  buildChat({ state, outcome }) {
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
      weaponUsed: outcome.weaponUsed,
      weaponUsageSuccess: outcome.weaponUsageSuccess,
      weaponDamage: outcome.weaponDamage,
      weaponInflictInjury: outcome.weaponInflictInjury,
      weaponSpecialRules: outcome.weaponSpecialRules
    };

    return { template, chatData };
  }

  async post({ actor, state, outcome }) {
    const { template, chatData } = this.buildChat({ state, outcome });
    // render and post chat message new method
    return createArkhamHorrorChatCard( {actor, template, chatVars: chatData, flags: {"arkham-horror-rpg-fvtt": chatData}});
    }

  /**
   * Convenience method: run end-to-end without an external orchestrator.
   * (Optional; remove if you prefer a shared RollOrchestrator.)
   */
  async run({ actor, state }) {
    const plan = await this.plan({ actor, state });
    const exec = await this.execute({ actor, plan });
    const outcome = this.computeOutcome({ state, plan, exec });
    await this.applyEffects({ actor, outcome });
    const posted = await this.post({ actor, state, outcome });
    return { plan, exec, outcome, ...posted };
  }
}