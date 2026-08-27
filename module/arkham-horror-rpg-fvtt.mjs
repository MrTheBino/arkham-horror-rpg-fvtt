// Import document classes.
import { ArkhamHorrorActor } from './documents/actor.mjs';
import { ArkhamHorrorItem } from './documents/item.mjs';
// Import sheet classes.
import { ArkhamHorrorActorSheet } from './sheets/actor-sheet.mjs';
import { ArkhamHorrorNpcSheet } from './sheets/npc-sheet.mjs';
import { ArkhamHorrorVehicleSheet } from './sheets/vehicle-sheet.mjs';
import { ArkhamHorrorItemSheet } from './sheets/item-sheet.mjs';
import { ArkhamHorrorProtectiveEquipmentSheet } from './sheets/item-protective-equipment-sheet.mjs';
import { ArkhamHorrorFavorSheet } from './sheets/item-favor-sheet.mjs';
import { ArkhamHorrorWeaponSheet } from './sheets/item-weapon-sheet.mjs';
import { ArkhamHorrorSpellSheet } from './sheets/item-spell-sheet.mjs';
import { ArkhamHorrorUsefulItemSheet } from './sheets/item-useful-item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { ARKHAM_HORROR } from './helpers/config.mjs';
import { ArkhamHorrorCombatTracker } from './combat/combat-tracker.mjs';
import { TokenInformationOverlay } from './overlay/token-information.mjs';

// Import DataModel classes
import * as models from './data/_module.mjs';

import { setupConfiguration } from './util/configuration.mjs';
import { registerChatRerollHooks } from './hooks/chat-reroll-hooks.mjs';
import { registerChatDefendHooks } from './hooks/chat-defend-hooks.mjs';
import { registerChatTraumaHooks } from './hooks/chat-trauma-hooks.mjs';
import { refreshInsightAndPost, spendInsightAndPost, refreshInsight, spendInsight } from './helpers/insight.mjs';

import { applyKnackGrantsOnAcquire, removeKnackGrantedSpellsOnDelete } from './helpers/knacks.mjs';

import { refreshDicepoolAndPost } from './helpers/dicepool.mjs';
import { configureStatusEffects } from './helpers/status-effects.mjs';
import * as money from './helpers/money.mjs';
import { resourcesApi } from './api/resources/index.mjs';
import { rollsApi } from './api/rolls/index.mjs';
import { insightApi } from './api/insight/index.mjs';
import { dicepoolApi } from './api/dicepool/index.mjs';


/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.arkhamhorrorrpgfvtt = {
    ArkhamHorrorActor,
    ArkhamHorrorItem,
    arkhamHorrorResetSceneActorDicePool: arkhamHorrorResetSceneActorDicePool,
    spendInsight,
    refreshInsight,
    spendInsightAndPost,
    refreshInsightAndPost,
    money,
    api: {
      version: "v1",
      capabilities: {
        resources: resourcesApi.version,
        rolls: rollsApi.version,
        insight: insightApi.version,
        dicepool: dicepoolApi.version,
      },
      resources: resourcesApi,
      rolls: rollsApi,
      insight: insightApi,
      dicepool: dicepoolApi,
    },
  };

  // Add custom constants for configuration.
  CONFIG.ARKHAM_HORROR = ARKHAM_HORROR;
  configureStatusEffects();

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
    npc: models.ArkhamHorrorNPC,
    vehicle: models.ArkhamHorrorVehicle
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
    favor: models.ArkhamHorrorFavor,
    archetype: models.ArkhamHorrorArchetype
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
  foundry.documents.collections.Actors.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorVehicleSheet, {
    makeDefault: false,
    types: ['vehicle'],
    label: 'ARKHAM_HORROR.SheetLabels.Vehicle',
  });

  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorItemSheet, {
    makeDefault: true,
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });

  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorProtectiveEquipmentSheet, {
    makeDefault: true,
    types: ['protective_equipment'],
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });

  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorFavorSheet, {
    makeDefault: true,
    types: ['favor'],
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });

  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorWeaponSheet, {
    makeDefault: true,
    types: ['weapon'],
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });

  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorSpellSheet, {
    makeDefault: true,
    types: ['spell'],
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });

  foundry.documents.collections.Items.registerSheet('arkham-horror-rpg-fvtt', ArkhamHorrorUsefulItemSheet, {
    makeDefault: true,
    types: ['useful_item'],
    label: 'ARKHAM_HORROR.SheetLabels.Item',
  });
  setupConfiguration();
  TokenInformationOverlay.registerHooks();
  registerChatRerollHooks();
  registerChatDefendHooks();
  registerChatTraumaHooks();

  // Knack spell grants: apply on acquire, remove on delete.
  // This is intentionally data-driven and does not require special purchase flows.
  Hooks.on('createItem', async (item) => {
    try {
      if (item?.type !== 'knack') return;
      const actor = item?.parent;
      if (!actor || !(actor instanceof Actor)) return;
      await applyKnackGrantsOnAcquire({ actor, knack: item, notify: false });
    } catch (e) {
      console.warn('Knack grant apply failed', e);
    }
  });

  Hooks.on('preDeleteItem', async (item) => {
    try {
      if (item?.type !== 'knack') return;
      const actor = item?.parent;
      if (!actor || !(actor instanceof Actor)) return;
      await removeKnackGrantedSpellsOnDelete({ actor, knack: item, notify: false });
    } catch (e) {
      console.warn('Knack grant remove failed', e);
    }
  });

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

Handlebars.registerHelper('ahIncludes', function (arr, value) {
  if (!Array.isArray(arr)) return false;
  return arr.includes(value);
});

Handlebars.registerHelper('formatCurrency', function (value) {
  // Accept numbers or numeric strings.
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return money.formatCurrency(numeric);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.on("renderPause", (_, html) => {
  html
    .find("img")
    .attr("src", "/systems/arkham-horror-rpg-fvtt/assets/images/pause.webp")
    .removeAttr("class");
});

Hooks.on("renderGamePause", (_, html) => {
  const img = html.querySelector("img");
  if (!img) return;
  img.src = "/systems/arkham-horror-rpg-fvtt/assets/images/pause.webp";
  img.classList.remove("fa-spin");
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
      game.i18n.localize('ARKHAM_HORROR.Warnings.MacroOwnedItemsOnly')
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
      await refreshDicepoolAndPost({
        actor,
        label: game.i18n.localize("ARKHAM_HORROR.DICEPOOL.Chat.Reset"),
        healDamage: false,
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
        game.i18n.format('ARKHAM_HORROR.Warnings.MacroItemNotFound', { itemName })
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
