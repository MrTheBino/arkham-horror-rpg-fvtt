// Functional implementation of helper functions for use by class based roll workflows see SkillWorkflow.mjs, etc.
// Allows for composable roll pipelines to be developed.

// Dice So Nice support integration
export function addShowDicePromise(promises, roll) {
  if (game.dice3d) {
    // synchronize=true so DSN dice appear on all players' screens
    promises.push(game.dice3d.showForRoll(roll, game.user, true, null, false));
  }
}

// Core D6 rolling function
// if rolling separately for horror dice, pass in dicePromises to collect all show dice promises together, see implementation in execute() in skill-roll-workflow.mjs
export async function rollD6({ actor, numDice, dicePromises } = {}) {
  const roll = new Roll(`${numDice}d6`, actor.getRollData());
  await roll.evaluate();

  // Render immediately (old app rendered before awaiting DSN)
  const html = await roll.render();
  const results = roll.terms[0].results.map(r => r.result);

  if (dicePromises) {
    addShowDicePromise(dicePromises, roll);
  } else {
    const promises = [];
    addShowDicePromise(promises, roll);
    await Promise.all(promises);
  }

  return { roll, html, results };
}

// Computes dice pools + success threshold exactly like original logic from 13.0.7 ALPHA dice-roll-app.
export function calculatePoolsAndThresholds({
  actor,
  skillCurrent,
  currentDicePool,
  diceToUse,
  penalty,
  bonusDice,
  rollWithAdvantage,
  rollWithDisadvantage,
}) {
  const skillCurrentNum = Number.parseInt(skillCurrent) || 0;
  const currentDicePoolNum = Number.parseInt(currentDicePool) || 0;
  const diceToUseNum = Number.parseInt(diceToUse) || 0;
  const numHorrorDice = Number.parseInt(actor.system.horror) || 0;

  let successOn = skillCurrentNum;
  let diceToRoll = diceToUseNum;
  let horrorDiceToRoll = 0;

  if (numHorrorDice >= currentDicePoolNum) {
    horrorDiceToRoll = diceToUseNum;
    diceToRoll = 0;
  } else {
    const normalDice = currentDicePoolNum - numHorrorDice;
    if (normalDice >= diceToUseNum) {
      diceToRoll = diceToUseNum;
    } else {
      horrorDiceToRoll = diceToUseNum - normalDice;
      diceToRoll = normalDice;
    }
  }

  const b = Number.parseInt(bonusDice) || 0;
  diceToRoll += b;

  const p = Number.parseInt(penalty) || 0;
  if (p > 0) {
    successOn = Math.min(6, successOn + p);
  }

  if (rollWithAdvantage) diceToRoll += 1;
  if (rollWithDisadvantage && diceToRoll > 0) diceToRoll += 1;

  return {
    successOn,
    diceToUse: diceToUseNum,
    diceToRoll,
    horrorDiceToRoll,
    penalty: p,
    bonusDice: b,
    rollWithAdvantage: !!rollWithAdvantage,
    rollWithDisadvantage: !!rollWithDisadvantage,
  };
}

//Combines normal + horror results into [{result,isHorror}]
export function collectTaggedResults({ normalResults, horrorResults = [] }) {
  const tagged = [];
  normalResults.forEach(r => tagged.push({ result: r, isHorror: false }));
  horrorResults.forEach(r => tagged.push({ result: r, isHorror: true }));
  return tagged;
}

// Drops highest or lowest die based on advantage/disadvantage flags like original logic from 13.0.7 ALPHA dice-roll-app.
// Note here that in the future we could use this same function rather than dropping we could tag the dice to show as dropped to the user on chat cards etc.
export function applyAdvantageDisadvantageDrop(diceRollResults, { rollWithAdvantage, rollWithDisadvantage }) {
  if (rollWithAdvantage) {
    const minResult = Math.min(...diceRollResults.map(r => r.result));
    const minIndex = diceRollResults.findIndex(r => r.result === minResult);
    diceRollResults.splice(minIndex, 1);
  }

  if (rollWithDisadvantage) {
    const maxResult = Math.max(...diceRollResults.map(r => r.result));
    const maxIndex = diceRollResults.findIndex(r => r.result === maxResult);
    diceRollResults.splice(maxIndex, 1);
  }
}

// Computes final success/failure counts based on modified dice results like original logic from 13.0.7 ALPHA dice-roll-app.
export function computeSkillOutcome(diceRollResults, { successOn, penalty, successesNeeded }) {
  // count all results that are >= 6
  let successCount = diceRollResults.filter(r => r.result >= 6).length;

  // failures (1s)
  const failureCount = diceRollResults.filter(r => r.result === 1 && !r.isHorror).length;
  const horrorFailureCount = diceRollResults.filter(r => r.result === 1 && r.isHorror).length;

  // keep 1s and 6s as-is
  let finalDiceRollResults = diceRollResults.filter(r => r.result === 1 || r.result === 6);

  // remaining dice (not 1 or 6)
  let tmpDiceRollResults = diceRollResults.filter(r => r.result !== 1 && r.result !== 6);

  // decrease remaining dice by penalty (consistent with original)
  tmpDiceRollResults = tmpDiceRollResults.map(r => ({ ...r, result: r.result - penalty }));

  // append remaining dice
  finalDiceRollResults = finalDiceRollResults.concat(tmpDiceRollResults);

  // check success threshold on modified dice now
  successCount += tmpDiceRollResults.filter(r => r.result >= successOn).length;

  const needed = Number.parseInt(successesNeeded) || 0;
  const isSuccess = successCount >= needed;

  return {
    isSuccess,
    successCount,
    failureCount,
    horrorFailureCount,
    finalDiceRollResults,
  };
}

// Deducts rolled dice from actor pool.
export async function applyDicepoolCost(actor, diceToUse) {
  const oldDicePoolValue = actor.system.dicepool.value;
  const newDicePoolValue = Math.max(0, oldDicePoolValue - diceToUse);
  await actor.update({ "system.dicepool.value": newDicePoolValue });
  return { oldDicePoolValue, newDicePoolValue };
}