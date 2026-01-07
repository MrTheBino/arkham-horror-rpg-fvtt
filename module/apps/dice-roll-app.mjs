const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class DiceRollApp extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.actor = options.actor;
        this.skillKey = options.skillKey;
        this.skillCurrent = options.skillCurrent;
        this.skillMax = options.skillMax;
        this.currentDicePool = options.currentDicePool;
        this.diceToUse = 0;
        this.rollWithAdvantage = false;
        this.rollWithDisadvantage = false;
        this.numBonusDice = 0;
        this.numPenalty = 0;

        DiceRollApp.instance = this;
    }

      /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        id: 'dice-roll-app',
        classes: ['dialog', 'dice-roll-app'],
        tag: 'div',
        window: {
            frame: true,
            title: 'Dice Roll',
            icon: 'fa-solid fa-book-atlas',
            positioned: true,
            resizable: true
        },
        position: {
            width: 400,
            height: 450
        },
        actions: {
            clickedRoll: this.#handleClickedRoll
        },
    };

      /** @override */
    static PARTS = {
        dialog: {
            template: 'systems/arkham-horror-rpg-fvtt/templates/dice-roll-app/dialog.hbs',
            scrollable: ['']
        }
    };

    setOptions(options) {
        if (options.actor) {
            this.actor = options.actor;
        }
        if(options.skillKey) {
            this.skillKey = options.skillKey;
        }
        if(options.skillCurrent !== undefined) {
            this.skillCurrent = options.skillCurrent;
        }
        if(options.skillMax !== undefined) { 
            this.skillMax = options.skillMax;
        }
        if(options.currentDicePool !== undefined) {
            this.currentDicePool = options.currentDicePool;
        }

        this.rollWithAdvantage = false;
        this.rollWithDisadvantage = false;
        this.numBonusDice = 0;
        this.numPenalty = 0;
    }

    static getInstance(options = {}) {
        if (!DiceRollApp.instance) {
            DiceRollApp.instance = new DiceRollApp(options);
        }
        let instance = DiceRollApp.instance;
        instance.setOptions(options);
        return instance;
    }

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actor = this.actor;
        context.skillKey = this.skillKey;
        context.skillCurrent = this.skillCurrent;
        context.skillMax = this.skillMax;
        context.currentDicePool = this.currentDicePool;
        context.diceToUse = this.diceToUse;
        return context;
    }

    addShowDicePromise(promises, roll) {
        if (game.dice3d) {
            // we pass synchronize=true so DSN dice appear on all players' screens
            promises.push(game.dice3d.showForRoll(roll, game.user, true, null, false));
        }
    }

    static async #handleClickedRoll(event,target){
        this.clickedRollCallback(event,target);
    }

    async clickedRollCallback(event,target){
        event.preventDefault();
        let successOn = parseInt(target.form.skillCurrent.value);
        let diceToUse = parseInt(target.form.diceToUse.value);
        let penalty = parseInt(target.form.penalty.value) || 0;
        let bonusDice = parseInt(target.form.bonus_dice.value) || 0;
        let modifierAdvantage = parseInt(target.form.advantageModifier.value) || 0;
        let successesNeeded = parseInt(target.form.difficulty.value) || 0;

        if(modifierAdvantage === 1){
            this .rollWithAdvantage = true;
            this.rollWithDisadvantage = false;
        }
        else if(modifierAdvantage === 2){
            this.rollWithDisadvantage = true;
            this.rollWithAdvantage = false;
        }
        else if(modifierAdvantage === 3){//handleClickedRollAdvantage
            this.rollWithDisadvantage = true;
            this.rollWithAdvantage = true;
        }
        else if(modifierAdvantage === 0){
            this.rollWithAdvantage = false;
            this.rollWithDisadvantage = false;
        }

        let numHorrorDice = this.actor.system.horror;
        let numHorrorToUse = 0;
        let diceToRoll = diceToUse;
        let horrorDiceToRoll = 0;
        if(numHorrorDice >= this.currentDicePool){ // all dice are horror dice
            horrorDiceToRoll = diceToUse;
            diceToRoll = 0;
        }
        else{
            let normalDice = this.currentDicePool - numHorrorDice;
            if(normalDice >= diceToUse){ // all dice are normal dice
                diceToRoll = diceToUse;
            }
            else{ // some horror dice, some normal dice
                horrorDiceToRoll = diceToUse - normalDice;
                diceToRoll = normalDice;
            }
        }

        diceToRoll += bonusDice;
        if(penalty > 0){
            successOn += penalty;
            if(successOn > 6){
                successOn = 6;
            }
        }
        
        const dicePromises = []; 

        // horror dice
        let horrorDiceRollHTML = "";
        let rollFormulaHorror = `${horrorDiceToRoll}d6`;
        let horrorDiceRoll = null;
        if(horrorDiceToRoll > 0){
            horrorDiceRoll = new Roll(rollFormulaHorror, this.actor.getRollData());
            await horrorDiceRoll.evaluate();
            this.addShowDicePromise(dicePromises, horrorDiceRoll);
            horrorDiceRollHTML = await horrorDiceRoll.render();
        }

        if(this.rollWithAdvantage){
            diceToRoll += 1;
        }
        if(this.rollWithDisadvantage && diceToRoll > 0){
            diceToRoll += 1;
        }

        // normal dice
        let rollFormula = `${diceToRoll}d6`;
        const diceRoll = new Roll(rollFormula, this.actor.getRollData());
        await diceRoll.evaluate();

        
        this.addShowDicePromise(dicePromises, diceRoll);
        await Promise.all(dicePromises);

        let diceRollResults = [];
        // we add all results from normal dice as a hash with the tag that it's not a horror die
        diceRoll.terms[0].results.forEach(result => {
            diceRollResults.push({ result: result.result, isHorror: false });
        });

        // we add all results from the hortror dice as hash with the tag that it is a horror die
        if(horrorDiceToRoll > 0){
            horrorDiceRoll.terms[0].results.forEach(result => {
                diceRollResults.push({ result: result.result, isHorror: true });
            });
        }

        // if we have advantage, remove one of the lowest dice
        if(this.rollWithAdvantage){
            let minResult = Math.min(...diceRollResults.map(r => r.result));
            let minIndex = diceRollResults.findIndex(r => r.result === minResult);
            diceRollResults.splice(minIndex, 1);
        }

        // if we have disadvantage, remove one of the highest dice
        if(this.rollWithDisadvantage){
            let maxResult = Math.max(...diceRollResults.map(r => r.result));
            let maxIndex = diceRollResults.findIndex(r => r.result === maxResult);
            diceRollResults.splice(maxIndex, 1);
        }

        // count all results that are >= 6
        let successCount = diceRollResults.filter(result => result.result >= 6).length;
        

        // count all failures (1s)
        let failureCount = diceRollResults.filter(result => result.result === 1 && !result.isHorror).length;
        // count horror failures (1s)
        let horrorFailureCount = diceRollResults.filter(result => result.result === 1 && result.isHorror).length;

        // copy all 6 and 1 results to finalDiceRollResults
        let finalDiceRollResults = diceRollResults.filter(result => result.result === 1 || result.result === 6);

        // remove all ones and 6 from the diceRollResults
        let tmpDiceRollResults = diceRollResults.filter(result => result.result !== 1 && result.result !== 6);

        // decrease tmpDiceRollResults entry result by penality amount
        tmpDiceRollResults = tmpDiceRollResults.map(result => {
            let newResult = result.result - penalty;
            return { ...result, result: newResult };
        });

        // copy all tmpDiceRollResults to finalDiceRollResults
        finalDiceRollResults = finalDiceRollResults.concat(tmpDiceRollResults);
        
        // we check the success on the modifier dice now
        successCount += tmpDiceRollResults.filter(result => result.result >= successOn).length;


        let isSuccess = false;
        if(successCount >= successesNeeded){
            isSuccess = true;
        }

        let diceRollHTML = await diceRoll.render();

        // subtract used dice from actor's dicepool
        let oldDicePoolValue = this.actor.system.dicepool.value;
        let newDicePoolValue = Math.max(0, this.actor.system.dicepool.value - diceToUse);
        await this.actor.update({ 'system.dicepool.value': newDicePoolValue });

        const chatVars = {
            diceRollHTML: diceRollHTML,
            horrorDiceRollHTML: horrorDiceRollHTML,
            successOn: successOn,
            diceToUse: diceToUse,
            results: finalDiceRollResults,
            successCount: successCount,
            failureCount: failureCount,
            skillUsed: game.i18n.localize(`ARKHAM_HORROR.SKILL.${this.skillKey}`), // localized key here
            newDicePoolValue: newDicePoolValue,
            oldDicePoolValue: oldDicePoolValue,
            horrorFailureCount: horrorFailureCount,
            horrorDiceToRoll: horrorDiceToRoll,
            isSuccess: isSuccess,
            penalty: penalty,
            bonusDice: bonusDice,
            successesNeeded: successesNeeded,
            rollWithAdvantage: this.rollWithAdvantage,
            rollWithDisadvantage: this.rollWithDisadvantage,
            horrorDiceUsed: horrorDiceToRoll > 0 ? true : false
        };

        const html = await foundry.applications.handlebars.renderTemplate(
            `systems/arkham-horror-rpg-fvtt/templates/chat/roll-result.hbs`,
            chatVars
        );
        ChatMessage.create({
            content: html,
            speaker: ChatMessage.getSpeaker({ ctor: this.actor }),
        });

        this.close();
    }
}


// // ========================================================================
// // Potential implementation of SkillRollWorkflow refactor for DiceRollApp 
// // As strictly UI gathering functions passing logic to SkillRollWorkflow with helper functions can then be extended for other roll types/dialogs/chat activation buttons etc..
// // Injury/Trauma, Rerolls, d3 rolls.
// // ========================================================================

// import { SkillRollWorkflow } from "../rolls/skill-roll-workflow.mjs";

// const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

// export class DiceRollApp extends HandlebarsApplicationMixin(ApplicationV2) {
//   constructor(options = {}) {
//     super(options);

//     this.actor = options.actor;
//     this.skillKey = options.skillKey;
//     this.skillCurrent = options.skillCurrent;
//     this.skillMax = options.skillMax;
//     this.currentDicePool = options.currentDicePool;

//     // Single canonical "book" of parameters
//     // (UI template context reads from here; workflow reads from here)
//     // NOTE: ApplicationV2 already has a getter-only `state`, so we must not assign to `this.state`.
//     this.rollState = {
//       skillKey: this.skillKey,
//       skillCurrent: this.skillCurrent,
//       skillMax: this.skillMax,
//       currentDicePool: this.currentDicePool,

//       diceToUse: 0,
//       penalty: 0,
//       bonusDice: 0,
//       successesNeeded: 0,

//       rollWithAdvantage: false,
//       rollWithDisadvantage: false,
//     };

//     DiceRollApp.instance = this;
//   }

//   /** @inheritDoc */
//   static DEFAULT_OPTIONS = {
//     id: "dice-roll-app",
//     classes: ["dialog", "dice-roll-app"],
//     tag: "div",
//     window: {
//       frame: true,
//       title: "Dice Roll",
//       icon: "fa-solid fa-book-atlas",
//       positioned: true,
//       resizable: true,
//     },
//     position: {
//       width: 400,
//       height: 450,
//     },
//     actions: {
//       clickedRoll: this.#handleClickedRoll,
//     },
//   };

//   /** @override */
//   static PARTS = {
//     dialog: {
//       template: "systems/arkham-horror-rpg-fvtt/templates/dice-roll-app/dialog.hbs",
//       scrollable: [""],
//     },
//   };

//   setOptions(options = {}) {
//     if (options.actor) this.actor = options.actor;
//     if (options.skillKey) this.skillKey = options.skillKey;
//     if (options.skillCurrent !== undefined) this.skillCurrent = options.skillCurrent;
//     if (options.skillMax !== undefined) this.skillMax = options.skillMax;
//     if (options.currentDicePool !== undefined) this.currentDicePool = options.currentDicePool;

//     // Keep rollState in sync (single book)
//     this.rollState.skillKey = this.skillKey;
//     this.rollState.skillCurrent = this.skillCurrent;
//     this.rollState.skillMax = this.skillMax;
//     this.rollState.currentDicePool = this.currentDicePool;

//     // Reset transient roll modifiers like your original code
//     this.rollState.rollWithAdvantage = false;
//     this.rollState.rollWithDisadvantage = false;
//     this.rollState.bonusDice = 0;
//     this.rollState.penalty = 0;
//     this.rollState.successesNeeded = 0;
//   }

//   static getInstance(options = {}) {
//     if (!DiceRollApp.instance) {
//       DiceRollApp.instance = new DiceRollApp(options);
//     }
//     const instance = DiceRollApp.instance;
//     instance.setOptions(options);
//     return instance;
//   }

//   async _prepareContext(options) {
//     const context = await super._prepareContext(options);

//     // Feed template from rollState (no separate context mapping logic)
//     return {
//       ...context,

//       actor: this.actor,

//       // everything your template expects:
//       skillKey: this.rollState.skillKey,
//       skillCurrent: this.rollState.skillCurrent,
//       skillMax: this.rollState.skillMax,
//       currentDicePool: this.rollState.currentDicePool,
//       diceToUse: this.rollState.diceToUse,

//       // include these if your template shows them (optional)
//       penalty: this.rollState.penalty,
//       bonusDice: this.rollState.bonusDice,
//       successesNeeded: this.rollState.successesNeeded,
//       rollWithAdvantage: this.rollState.rollWithAdvantage,
//       rollWithDisadvantage: this.rollState.rollWithDisadvantage,
//     };
//   }

//   static async #handleClickedRoll(event, target) {
//     this.clickedRollCallback(event, target);
//   }

//   async clickedRollCallback(event, target) {
//     event.preventDefault();
//     const form = target.form;

//     // Update rollState FROM UI once
//     this.rollState.skillCurrent = Number.parseInt(form.skillCurrent.value);
//     this.rollState.diceToUse = Number.parseInt(form.diceToUse.value);
//     this.rollState.penalty = Number.parseInt(form.penalty.value) || 0;
//     this.rollState.bonusDice = Number.parseInt(form.bonus_dice.value) || 0;
//     this.rollState.successesNeeded = Number.parseInt(form.difficulty.value) || 0;

//     // Advantage / disadvantage selector logic (same as original intent)
//     const modifierAdvantage = Number.parseInt(form.advantageModifier.value) || 0;
//     if (modifierAdvantage === 1) {
//       this.rollState.rollWithAdvantage = true;
//       this.rollState.rollWithDisadvantage = false;
//     } else if (modifierAdvantage === 2) {
//       this.rollState.rollWithDisadvantage = true;
//       this.rollState.rollWithAdvantage = false;
//     } else if (modifierAdvantage === 3) {
//       this.rollState.rollWithAdvantage = true;
//       this.rollState.rollWithDisadvantage = true;
//     } else {
//       this.rollState.rollWithAdvantage = false;
//       this.rollState.rollWithDisadvantage = false;
//     }

//     // Run workflow end-to-end (roll + update actor + post chat)
//     // Keep parameter name "state" but pass the renamed property
//     const workflow = new SkillRollWorkflow();
//     await workflow.run({ actor: this.actor, state: this.rollState });

//     this.close();
//   }
// }
