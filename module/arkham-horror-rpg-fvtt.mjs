// Import document classes.
import { ArkhamHorrorActor } from './documents/actor.mjs';
import { ArkhamHorrorItem } from './documents/item.mjs';
// Import sheet classes.
import { ArkhamHorrorActorSheet } from './sheets/actor-sheet.mjs';
import { ArkhamHorrorNpcSheet } from './sheets/npc-sheet.mjs';
import { ArkhamHorrorItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { ARKHAM_HORROR } from './helpers/config.mjs';
import { ArkhamHorrorCombatTracker } from './combat/combat-tracker.mjs';
import { TokenInformationOverlay } from './overlay/token-information.mjs';

// Import DataModel classes
import * as models from './data/_module.mjs';

import { setupConfiguration } from './util/configuration.mjs';


/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.arkhamhorrorrpgfvtt = {
    ArkhamHorrorActor,
    ArkhamHorrorItem,
    arkhamHorrorResetSceneActorDicePool: arkhamHorrorResetSceneActorDicePool
  };

  // Add custom constants for configuration.
  CONFIG.ARKHAM_HORROR = ARKHAM_HORROR;

  // Override the sidebar Combat Tracker UI (Arkham is side-based, not initiative-based).
  CONFIG.ui.combat = ArkhamHorrorCombatTracker;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d20 + @abilities.dex.mod',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = ArkhamHorrorActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.ArkhamHorrorCharacter,
    npc: models.ArkhamHorrorNPC
  }
  CONFIG.Item.documentClass = ArkhamHorrorItem;
  CONFIG.Item.dataModels = {
    //item: models.ArkhamHorrorItem,
    //feature: models.ArkhamHorrorFeature,
    spell: models.ArkhamHorrorSpell,
    knack: models.ArkhamHorrorKnack,
    personality_trait: models.ArkhamHorrorPersonalityTrait,
    weapon: models.ArkhamHorrorWeapon,
    protective_equipment: models.ArkhamHorrorProtectiveEquipment,
    useful_item: models.ArkhamHorrorUsefulItem,
    tome: models.ArkhamHorrorTome,
    relic: models.ArkhamHorrorRelic,
    injury: models.ArkhamHorrorInjury,
    trauma: models.ArkhamHorrorTrauma,
    favor: models.ArkhamHorrorFavor
  }

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorActorSheet, {
    makeDefault: true,
    types: ['character'],
    label: 'ARKHAM_HORROR.SheetLabels.Actor',
  });
  foundry.documents.collections.Actors.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorNpcSheet, {
    makeDefault: false,
    types: ['npc'],
    label: 'ARKHAM_HORROR.SheetLabels.NPC',
  });
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorItemSheet, {
    makeDefault: true,
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });

  setupConfiguration();
  TokenInformationOverlay.registerHooks();
  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.arkhamhorrorrpgfvtt.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'arkham-horror-rpg-fvtt.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

// helper function to reset the dice pool of all actors in the current scene
// can be called via a macro: game.arkhamhorrorrpgfvtt.arkhamHorrorResetSceneActorDicePool()
async function arkhamHorrorResetSceneActorDicePool() {
  for (let token of canvas.tokens.placeables) {
    const actor = token.actor;
    if (actor?.type === 'character' || actor?.type === 'npc') {
      let oldValue = actor.system.dicepool.value;
      let newValue = actor.system.dicepool.max - actor.system.damage;
      await actor.update({ 'system.dicepool.value': newValue });

      const chatVars = {
        label: 'Dicepool Reset',
        actorName: actor.name,
        oldDicePoolValue: oldValue,
        newDicePoolValue: newValue
      };

      const html = await foundry.applications.handlebars.renderTemplate(
        "systems/arkham-horror-rpg-fvtt/templates/chat/dicepool-reset.hbs",
        chatVars
      );
      ChatMessage.create({
        content: html,
        speaker: ChatMessage.getSpeaker({ actor }),
      });
    }
  }
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
