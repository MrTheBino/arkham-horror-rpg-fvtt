const SYSTEM_ID = 'arkham-horror-rpg-fvtt';
const EFFECT_ICON_ROOT = `systems/${SYSTEM_ID}/assets/icons/effects`;
const ACTOR_TYPES = ['character', 'npc'];
const NPC_ACTOR_TYPES = ['npc'];
const MANAGED_EFFECT_FLAG = 'managedStatusEffect';

// This function allows us to clone a core status effect and override some of its properties.
// This is useful for creating system-specific status effects that are based on core status effects, but have different properties (e.g., different icons, different names, etc.).
function cloneCoreStatus(coreStatuses, id, overrides = {}) {
  const status = coreStatuses.get(id);
  if (!status) throw new Error(`Core status effect "${id}" is unavailable`);
  return foundry.utils.mergeObject(foundry.utils.deepClone(status), overrides, { inplace: true });
}

function systemStatus(id, name, img, order, overrides = {}) {
  return {
    id,
    name,
    img,
    order,
    hud: { actorTypes: ACTOR_TYPES },
    ...overrides,
  };
}

function statusForId(statusId) {
  return [...CONFIG.statusEffects].find(status => status.id === statusId) ?? null;
}

function statusMatchesItemType(statusId, itemType) {
  if (itemType === 'injury') return statusId.startsWith('injury-') || ['dead', 'prone'].includes(statusId);
  if (itemType === 'trauma') return statusId.startsWith('trauma-');
  return false;
}

// This function returns a list of status effect choices that are valid for the given item type for use on our item sheets.
// It also filters the list based on the actor type if provided, and marks the selected status effect if provided.
export function getItemStatusEffectChoices(itemType, selectedId = '', actorType = null) {
  return [...CONFIG.statusEffects]
    .filter(status => statusMatchesItemType(status.id, itemType))
    .filter(status => !actorType || !Array.isArray(status.hud?.actorTypes) || status.hud.actorTypes.includes(actorType))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map(status => ({
      id: status.id,
      label: game.i18n.localize(status.name),
      selected: status.id === selectedId,
    }));
}

function managedEffects(item) {
  return [...(item.effects ?? [])].filter(effect => effect.getFlag(SYSTEM_ID, MANAGED_EFFECT_FLAG));
}

function effectShouldBeDisabled(item, statusId) {
  if (item.system?.active === false) return true;
  return statusId.startsWith('trauma-npc-') && item.actor && item.actor.type !== 'npc';
}

export async function synchronizeItemStatusEffect(item) {
  if (!['injury', 'trauma'].includes(item?.type)) return;

  const statusId = String(item.system?.statusEffectId ?? '');
  const configuredStatus = statusForId(statusId);
  const validStatus = configuredStatus && statusMatchesItemType(statusId, item.type);
  const existingEffects = managedEffects(item);
  const matchingEffect = existingEffects.find(effect =>
    effect.getFlag(SYSTEM_ID, MANAGED_EFFECT_FLAG)?.statusId === statusId
  );

  const effectsToDelete = existingEffects.filter(effect => !validStatus || effect !== matchingEffect);
  if (effectsToDelete.length) {
    await item.deleteEmbeddedDocuments('ActiveEffect', effectsToDelete.map(effect => effect.id));
  }
  if (!validStatus) return;

  const disabled = effectShouldBeDisabled(item, statusId);
  if (matchingEffect) {
    const updates = {};
    if (matchingEffect.disabled !== disabled) updates.disabled = disabled;
    if (!matchingEffect.transfer) updates.transfer = true;
    if (matchingEffect.origin !== item.uuid) updates.origin = item.uuid;
    if (Object.keys(updates).length) await matchingEffect.update(updates);
    return;
  }

  const ActiveEffect = getDocumentClass('ActiveEffect');
  const effect = await ActiveEffect.fromStatusEffect(statusId, { parent: item });
  effect.updateSource({
    disabled,
    transfer: true,
    origin: item.uuid,
    flags: {
      [SYSTEM_ID]: {
        [MANAGED_EFFECT_FLAG]: { statusId },
      },
    },
  });
  await item.createEmbeddedDocuments('ActiveEffect', [effect.toObject()], { keepId: true });
}

export function configureStatusEffects() {
  const statuses = CONFIG.statusEffects;
  const coreStatuses = new Map([...statuses].map(status => [status.id, status]));

  // Core statuses that are visible in the HUD, in the order they should appear using our clone override. Any not listed here are hidden from the HUD but still available.
  const visibleCoreStatuses = [
    cloneCoreStatus(coreStatuses, 'dead', { order: 500 }),
    cloneCoreStatus(coreStatuses, 'prone', { order: 510 }),
    cloneCoreStatus(coreStatuses, 'restrain', { order: 520 }),
    cloneCoreStatus(coreStatuses, 'fly', { order: 530 }),
    cloneCoreStatus(coreStatuses, 'hover', { order: 540 }),
    cloneCoreStatus(coreStatuses, 'burrow', { order: 550 }),
    cloneCoreStatus(coreStatuses, 'invisible', { order: 560 }),
    cloneCoreStatus(coreStatuses, 'blind', { order: 570 }),
  ];

  const visibleCoreIds = new Set(visibleCoreStatuses.map(status => status.id));

  // Hide the core statuses not in our visible list.
  const hiddenSpecialStatuses = [...new Set(Object.values(CONFIG.specialStatusEffects))]
    .filter(id => !visibleCoreIds.has(id))
    .map(id => cloneCoreStatus(coreStatuses, id, { hud: false }));

  const systemStatuses = [
    systemStatus('cover', 'ARKHAM_HORROR.StatusEffects.Cover',
      'icons/svg/shield.svg', 50),

    systemStatus('injury-slowed', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.Slowed',
      `${EFFECT_ICON_ROOT}/injury-slowed.svg`, 100),
    systemStatus('injury-nasty-cut', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.NastyCut',
      `${EFFECT_ICON_ROOT}/injury-nasty-cut.svg`, 110),
    systemStatus('injury-concussed', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.Concussed',
      `${EFFECT_ICON_ROOT}/injury-concussed.svg`, 120),
    systemStatus('injury-arm', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.InjuredArm',
      `${EFFECT_ICON_ROOT}/injury-arm.svg`, 130),
    systemStatus('injury-leg', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.InjuredLeg',
      `${EFFECT_ICON_ROOT}/injury-leg.svg`, 140),
    systemStatus('injury-loss-sight', 'ARKHAM_HORROR.StatusEffects.LossOfSight',
      `${EFFECT_ICON_ROOT}/injury-loss-sight.svg`, 150, { _id: 'ahrLossSight0001', statuses: ['blind'] }),
    systemStatus('injury-loss-hearing', 'ARKHAM_HORROR.StatusEffects.LossOfHearing',
      `${EFFECT_ICON_ROOT}/injury-loss-hearing.svg`, 160),
    systemStatus('injury-loss-smell', 'ARKHAM_HORROR.StatusEffects.LossOfSmell',
      `${EFFECT_ICON_ROOT}/injury-loss-smell.svg`, 170),
    systemStatus('injury-severely-injured', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.SeverelyInjured',
      `${EFFECT_ICON_ROOT}/injury-severely-injured.svg`, 180),
    systemStatus('injury-comatose', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.Comatose',
      `${EFFECT_ICON_ROOT}/injury-comatose.svg`, 190),
    systemStatus('injury-dire', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Injury.Dire',
      `${EFFECT_ICON_ROOT}/injury-dire.svg`, 200),
    systemStatus('injury-burned', 'ARKHAM_HORROR.StatusEffects.Burned',
      `${EFFECT_ICON_ROOT}/injury-burned.svg`, 210),
    systemStatus('injury-choking', 'ARKHAM_HORROR.StatusEffects.Choking',
      `${EFFECT_ICON_ROOT}/injury-choking.svg`, 220),
    systemStatus('injury-sickened', 'ARKHAM_HORROR.StatusEffects.Sickened',
      `${EFFECT_ICON_ROOT}/injury-sickened.svg`, 230),

    systemStatus('trauma-shocked', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Trauma.Shocked',
      `${EFFECT_ICON_ROOT}/trauma-shocked.svg`, 300),
    systemStatus('trauma-stunned', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Trauma.Stunned',
      `${EFFECT_ICON_ROOT}/trauma-stunned.svg`, 310),
    systemStatus('trauma-overcome-by-horror', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Trauma.OvercomeByHorror',
      `${EFFECT_ICON_ROOT}/trauma-overcome-by-horror.svg`, 320),
    systemStatus('trauma-mind-undone', 'ARKHAM_HORROR.InjuryTrauma.Fallback.Trauma.MindUndone',
      `${EFFECT_ICON_ROOT}/trauma-mind-undone.svg`, 330),
    systemStatus('trauma-bloodlust', 'ARKHAM_HORROR.StatusEffects.Bloodlust',
      `${EFFECT_ICON_ROOT}/trauma-bloodlust.svg`, 340),

    systemStatus('trauma-npc-cower', 'ARKHAM_HORROR.StatusEffects.NpcCower',
      `${EFFECT_ICON_ROOT}/trauma-npc-cower.svg`, 700, { hud: { actorTypes: NPC_ACTOR_TYPES } }),
    systemStatus('trauma-npc-flee', 'ARKHAM_HORROR.StatusEffects.NpcFlee',
      `${EFFECT_ICON_ROOT}/trauma-npc-flee.svg`, 710, { hud: { actorTypes: NPC_ACTOR_TYPES } }),
    systemStatus('trauma-npc-panicked', 'ARKHAM_HORROR.StatusEffects.NpcPanicked',
      `${EFFECT_ICON_ROOT}/trauma-npc-panicked.svg`, 720, { hud: { actorTypes: NPC_ACTOR_TYPES } }),
    systemStatus('trauma-npc-stupefied', 'ARKHAM_HORROR.StatusEffects.NpcStupefied',
      `${EFFECT_ICON_ROOT}/trauma-npc-stupefied.svg`, 730, { hud: { actorTypes: NPC_ACTOR_TYPES } }),
  ];

  statuses.length = 0;
  for (const status of [...visibleCoreStatuses, ...hiddenSpecialStatuses, ...systemStatuses]) {
    statuses.push(status);
  }
}