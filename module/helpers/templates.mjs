/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/actor-features.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/actor-items.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/actor-spells.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/actor-effects.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/_skill.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-knacks.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-insight.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-dicepool.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-personality-trait.hbs',
    'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-injuries.hbs',
    // Item partials
    'systems/arkham-horror-rpg-fvtt/templates/item/parts/item-effects.hbs',
  ]);
};
