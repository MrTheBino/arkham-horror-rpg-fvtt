/** Artwork a freshly created ActiveEffect starts with. */
const NEW_EFFECT_IMG = 'icons/svg/aura.svg';

// This function is a workaround for the fact that Foundry v14 changed the duration format from {rounds: 1} to {value: 1, units: 'rounds'} and the v13 format is no longer valid.
// This function will return the correct format based on the Foundry version.
// To maintain v13 compatibility, we will use the v13 format for Foundry v13 and the v14 format for Foundry v14 and above.
// This function is not necessary if we hard limit the system to Foundry v14 and above, but we will keep it for now to maintain compatibility with v13.
function oneRoundDuration() {
  return game.release.generation >= 14
    ? { value: 1, units: 'rounds' }
    : { rounds: 1 };
}

/**
 * Collect every ActiveEffect that applies to an Actor, including the ones transferred from owned
 * Items. The system runs with `CONFIG.ActiveEffect.legacyTransferral = false`, so those effects stay
 * on the Item and only *apply* to the Actor — `actor.effects` alone would not list them.
 * @param {Actor} actor
 * @returns {ActiveEffect[]}
 */
export function collectActorEffects(actor) {
  if (!actor) return [];
  if (typeof actor.allApplicableEffects === 'function') return [...actor.allApplicableEffects()];
  return [...(actor.effects ?? [])];
}

/**
 * Whether an effect is owned by an Item rather than by the Actor sheet showing it.
 * @param {ActiveEffect} effect
 * @returns {boolean}
 */
export function isItemOwnedEffect(effect) {
  return effect?.parent?.documentName === 'Item';
}

/**
 * Resolve the ActiveEffect a clicked sheet control belongs to.
 * The row carries the full UUID rather than an id, because item-transferred effects are not part of
 * `owner.effects` and could not be looked up on the Actor.
 * @param {HTMLElement} target    The clicked control
 * @returns {ActiveEffect|null}
 */
export function resolveEffectFromTarget(target) {
  const uuid = target?.closest?.('[data-effect-uuid]')?.dataset?.effectUuid;
  if (!uuid) return null;
  return fromUuidSync(uuid) ?? null;
}

/**
 * Create a new ActiveEffect on the owning document, pre-set for the category it was created in.
 * @param {Actor|Item} owner
 * @param {string} [type]         One of `temporary`, `passive`, `inactive`
 */
export async function createActiveEffect(owner, type = 'passive') {
  return owner.createEmbeddedDocuments('ActiveEffect', [{
    name: game.i18n.format('DOCUMENT.New', { type: game.i18n.localize('DOCUMENT.ActiveEffect') }),
    img: NEW_EFFECT_IMG,
    origin: owner.uuid,
    duration: type === 'temporary' ? oneRoundDuration() : {},
    disabled: type === 'inactive'
  }]);
}

/**
 * Delete an ActiveEffect. Effects belonging to an Item are refused here: they are part of that Item
 * and removing them from the Actor sheet would silently edit the Item for every owner of it.
 * @param {ActiveEffect} effect
 */
export async function deleteActiveEffect(effect) {
  if (!effect) return;
  if (isItemOwnedEffect(effect)) {
    ui.notifications.warn(game.i18n.format('ARKHAM_HORROR.Effect.Errors.DeleteOnItem', {
      itemName: effect.parent?.name ?? ''
    }));
    return;
  }
  return effect.delete();
}

/**
 * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons.
 * The action names are effect specific (`effectCreate`, `effectEdit`, `effectDelete`,
 * `effectToggle`) so they cannot collide with the item controls the sheets already register.
 * @param {Event} event           The originating click event
 * @param {Actor|Item} owner      The owning document which manages this effect
 * @param {HTMLElement} target    The clicked control (ApplicationV2 passes it explicitly, because
 *                                `event.currentTarget` is the delegating form root)
 */
export async function onManageActiveEffect(event, owner, target = event?.currentTarget) {
  event?.preventDefault?.();
  if (!owner || !target) return;

  const action = target.dataset?.action;
  const isEditable = owner.isOwner || game.user?.isGM;

  if (action === 'effectCreate') {
    if (!isEditable) return void ui.notifications.warn(game.i18n.localize('ARKHAM_HORROR.Effect.Errors.Permission'));
    return createActiveEffect(owner, target.dataset?.effectType);
  }

  const effect = resolveEffectFromTarget(target);
  if (!effect) return;

  switch (action) {
    case 'effectEdit':
      return effect.sheet?.render({ force: true });
    case 'effectToggle':
      if (!isEditable) return void ui.notifications.warn(game.i18n.localize('ARKHAM_HORROR.Effect.Errors.Permission'));
      return effect.update({ disabled: !effect.disabled });
    case 'effectDelete':
      if (!isEditable) return void ui.notifications.warn(game.i18n.localize('ARKHAM_HORROR.Effect.Errors.Permission'));
      return deleteActiveEffect(effect);
  }
}

/**
 * Flatten an ActiveEffect into the fields the sheet template needs.
 * @param {ActiveEffect} effect
 * @returns {object}
 */
function toEffectEntry(effect) {
  const fromItem = isItemOwnedEffect(effect);
  return {
    id: effect.id,
    uuid: effect.uuid,
    name: effect.name,
    // v12+ renamed the artwork field from `icon` to `img`.
    img: effect.img,
    disabled: effect.disabled,
    duration: { label: describeDuration(effect) },
    // Item effects carry no `origin`, so `sourceName` would read "None" — their source is the Item.
    // For an effect that lives on the Actor itself there is no meaningful source either; an em dash
    // reads better in the column than Foundry's literal "None".
    sourceName: fromItem ? effect.parent.name : normaliseNone(effect.sourceName),
    fromItem,
    itemName: fromItem ? effect.parent.name : ''
  };
}

const EM_DASH = '\u2014';

/** Foundry returns the literal string "None" for an absent value; blank out for display. */
function normaliseNone(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'None' || text === game.i18n.localize('None')) return EM_DASH;
  return text;
}

/**
 * Foundry's `duration.label` can read "None" for a combat-based duration while no combat is running,
 * which hides the configured value. Fall back to the stored duration fields for the current version.
 */
function describeDuration(effect) {
  const label = normaliseNone(effect.duration?.label);
  if (label !== EM_DASH) return label;

  const stored = effect._source?.duration ?? {};
  const positiveNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  const value = positiveNumber(stored.value);
  const units = String(stored.units ?? '');
  if (value && units) return `${value} ${game.i18n.localize(`EFFECT.DURATION.UNITS.${units}`)}`;
  if (game.release.generation >= 14) return EM_DASH;

  const rounds = positiveNumber(stored.rounds);
  if (rounds) return `${rounds} ${game.i18n.localize('COMBAT.Rounds')}`;

  const turns = positiveNumber(stored.turns);
  if (turns) return `${turns} ${game.i18n.localize('COMBAT.Turns')}`;

  const seconds = positiveNumber(stored.seconds);
  if (seconds) return `${seconds} s`;

  return EM_DASH;
}

/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: 'temporary',
      label: game.i18n.localize('ARKHAM_HORROR.Effect.Temporary'),
      effects: [],
    },
    passive: {
      type: 'passive',
      label: game.i18n.localize('ARKHAM_HORROR.Effect.Passive'),
      effects: [],
    },
    inactive: {
      type: 'inactive',
      label: game.i18n.localize('ARKHAM_HORROR.Effect.Inactive'),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (let e of effects) {
    const entry = toEffectEntry(e);
    if (e.disabled) categories.inactive.effects.push(entry);
    else if (e.isTemporary) categories.temporary.effects.push(entry);
    else categories.passive.effects.push(entry);
  }
  return categories;
}
