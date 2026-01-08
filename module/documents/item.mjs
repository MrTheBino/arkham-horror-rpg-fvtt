/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ArkhamHorrorItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
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
