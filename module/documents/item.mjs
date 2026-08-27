import { synchronizeItemStatusEffect } from '../helpers/status-effects.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ArkhamHorrorItem extends Item {
  static async _onCreateOperation(documents, operation, user) {
    await super._onCreateOperation(documents, operation, user);
    if (user?.id !== game.user?.id) return;
    for (const item of documents) await synchronizeItemStatusEffect(item);
  }

  static async _onUpdateOperation(documents, operation, user) {
    await super._onUpdateOperation(documents, operation, user);
    if (user?.id !== game.user?.id) return;
    for (const item of documents) await synchronizeItemStatusEffect(item);
  }

  /** @override */
  async _preUpdate(changed, options, userId) {
    await super._preUpdate(changed, options, userId);

    const deletePath = (obj, path) => {
      if (!obj || !path) return;
      const parts = String(path).split('.');
      let cur = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur || typeof cur !== 'object') return;
        cur = cur[parts[i]];
      }
      if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
    };

    // A useful item whose charges still live in the legacy `system.uses` gets them written into
    // `system.usage` the first time anything touches its charges (see
    // `data/item-useful-item.mjs`). Without this the seeded maximum stays at 0 in storage, so the
    // next data preparation would seed `remaining` from `uses.current` again and undo the change —
    // spending a charge would silently do nothing.
    if (this.type === 'useful_item' && foundry.utils.hasProperty(changed, 'system.usage')) {
      const storedMax = Number(this._source?.system?.usage?.max ?? 0) || 0;
      const legacyMax = Number(this._source?.system?.uses?.max ?? 0) || 0;

      if (storedMax <= 0 && legacyMax > 0 && !foundry.utils.hasProperty(changed, 'system.usage.max')) {
        foundry.utils.setProperty(changed, 'system.usage.max', legacyMax);
        if (!foundry.utils.hasProperty(changed, 'system.usage.decreaseAfterUsage')) {
          foundry.utils.setProperty(changed, 'system.usage.decreaseAfterUsage', true);
        }
      }
    }

    // Tome spell lists and base understanding difficulty are GM-managed.
    // Players can still own Tomes and update state like understood/attuned.
    if (this.type === 'tome') {
      const user = (userId ? game.users?.get(userId) : null) ?? game.user;
      const isGM = user?.isGM ?? false;

      if (!isGM) {
        const touchesSpellUuids = foundry.utils.hasProperty(changed, 'system.spellUuids')
          || (changed?.system && Object.prototype.hasOwnProperty.call(changed.system, 'spellUuids'));
        const touchesDifficulty = foundry.utils.hasProperty(changed, 'system.attunementDifficulty')
          || (changed?.system && Object.prototype.hasOwnProperty.call(changed.system, 'attunementDifficulty'));

        if (touchesSpellUuids || touchesDifficulty) {
          deletePath(changed, 'system.spellUuids');
          deletePath(changed, 'system.attunementDifficulty');
          ui.notifications?.warn?.(game.i18n.localize('ARKHAM_HORROR.Warnings.ItemTomeModifySpellListOrDifficultyGmOnly'));
        }
      }
    }
  }

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // This is currently a pass-through hook. If item document-level prep is not
    // needed, prefer removing the override rather than shadowing core behavior.
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  static async create(data, options = {}) {
    //make default Friendly and Linked on Creation
    data.prototypeToken = data.prototypeToken || {};

    let defaults = {};
    let image = null;
    
    switch(data.type){
      case 'weapon':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-weapon.svg";
        break;
      case 'tome':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-tome.svg";
        break;
      case 'relic':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-relic.svg";
        break;
      case 'useful_item':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-useful-item.svg";
        break;
      case 'protective_equipment':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-protective-item.svg";
        break;
      case 'knack':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-knack.svg";
        break;
      case 'personality_trait':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-personality-trait.svg";
        break;
      case 'injury':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-injury.svg";
        break;
      case 'trauma':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-trauma.svg";
        break;
      case 'favor':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-favor.svg";
        break;
      case 'spell':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-spell.svg";
        break;
      case 'archetype':
        image = "systems/arkham-horror-rpg-fvtt/assets/icons/icon-archetype.svg";
        break;
    }

    if (image != null) {
      data.img = image
    }

    const actor = await super.create(data, options);
    return actor;
  }
  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Convert the actor document to a plain object.
   *
   * The built in `toObject()` method will ignore derived data when using Data Models.
   * This additional method will instead use the spread operator to return a simplified
   * version of the data.
   *
   * @returns {object} Plain object either via deepClone or the spread operator.
   */
  toPlainObject() {
    const result = { ...this };

    // Simplify system data.
    result.system = this.system.toPlainObject();

    // Add effects.
    result.effects = this.effects?.size > 0 ? this.effects.contents : [];

    return result;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
}
