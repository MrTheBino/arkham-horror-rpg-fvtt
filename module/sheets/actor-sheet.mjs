const { ActorSheetV2 } = foundry.applications.sheets
const { HandlebarsApplicationMixin } = foundry.applications.api
const { TextEditor, DragDrop } = foundry.applications.ux
import { ArkhamHorrorItem } from "../documents/item.mjs";
import { DiceRollApp } from '../apps/dice-roll-app.mjs';

export class ArkhamHorrorActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['sheet', 'actor', 'character'],
        tag: 'form',
        position: {
            width: 700,
            height: 800
        },
        actions: {
            clickedDicePool: this.#handleClickedDicePool,
            clickedClearDicePool: this.#handleClickedClearDicePool,
            editItem: this.#handleEditItem,
            createItem: this.#handleCreateItem,
            deleteItem: this.#handleDeleteItem,
            toggleFoldableContent: this.#handleToggleFoldableContent,
            openActorArchetype: this.#handleOpenActorArchetype,
            clickSkill: this.#handleSkillClicked,
            clickWeaponReload: this.#handleWeaponReload,
            clickedRefreshDicePool: this.#handleClickedRefreshDicePool,
            clickedRollWithWeapon: this.#handleClickedRollWithWeapon
        },
        form: {
            submitOnChange: true
        },
        actor: {
            type: 'character'
        },
        dragDrop: [{
            dragSelector: '[draggable="true"]',
            dropSelector: '*' // this was .mist-engine.actor I am not sure if it was being used but changed to * for now?  
        }],
        window: {
            resizable: true,
            controls: [
            ]
        }
    }

    /** @inheritDoc */
    static PARTS = {
        header: {
            id: 'header',
            template: 'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-header.hbs'
        },
        tabs: {
            id: 'tabs',
            template: 'templates/generic/tab-navigation.hbs'
        },
        character: {
            id: 'character',
            template: 'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-main.hbs',
            scrollable: ['']
        },
        background: {
            id: 'background',
            template: 'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-background.hbs',
            scrollable: ['']
        },
        mundane_resources: {
            id: 'mundane_resources',
            template: 'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-mundane-resources.hbs',
            scrollable: ['']
        },
        supernatural_resources: {
            id: 'supernatural_resources',
            template: 'systems/arkham-horror-rpg-fvtt/templates/actor/parts/character-supernatural-resources.hbs',
            scrollable: ['']
        }
    }

    /**
 * Define the structure of tabs used by this sheet.
 * @type {Record<string, ApplicationTabsConfiguration>}
 */
    static TABS = {
        sheet: { // this is the group name
            tabs:
                [
                    { id: 'character', group: 'sheet', label: 'Character' },
                    { id: 'mundane_resources', group: 'sheet', label: 'Mundane Resources' },
                    { id: 'supernatural_resources', group: 'sheet', label: 'Supernatural Resources' },
                    { id: 'background', group: 'sheet', label: 'Background' }
                ],
            initial: 'character'
        }
    }

    constructor(options = {}) {
        super(options)
    }

    /** @inheritDoc */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        if (data?.type === 'ArkhamHorrorArchetypeKnack') {
            await this.#onDropArchetypeKnack(event, data);
            return;
        }

        return super._onDrop?.(event);
    }

    async #onDropArchetypeKnack(event, data) {
        const uuid = data?.uuid;
        const tier = Number(data?.tier);
        const sourceArchetypeUuid = data?.archetypeUuid;

        if (!uuid || !tier || tier < 1 || tier > 4) {
            ui.notifications.warn('Invalid archetype knack drop data.');
            return;
        }

        const actorArchetypeUuid = this.document.system?.archetypeUuid;
        if (!actorArchetypeUuid) {
            ui.notifications.warn('Set an archetype on this actor before purchasing knacks.');
            return;
        }
        if (sourceArchetypeUuid && actorArchetypeUuid !== sourceArchetypeUuid) {
            ui.notifications.warn('This knack belongs to a different archetype.');
            return;
        }

        const archetype = await fromUuid(actorArchetypeUuid);
        if (!archetype || archetype.type !== 'archetype') {
            ui.notifications.warn('Actor archetype reference is invalid.');
            return;
        }

        const tierData = archetype.system?.knackTiers?.[tier] ?? {};
        const allowed = (tierData.allowedKnacks ?? []).some(e => e?.uuid === uuid);
        if (!allowed) {
            ui.notifications.warn(`That knack is not allowed for Tier ${tier} by the actor's archetype.`);
            return;
        }

        const maxPurchasable = Number(archetype.system?.knackTiers?.[tier]?.maxPurchasable ?? 0);
        if (maxPurchasable <= 0) {
            ui.notifications.warn(`No Tier ${tier} knacks can be purchased for this archetype (max is ${maxPurchasable}).`);
            return;
        }

        // Policy: this counts ALL owned Knacks by tier (even if added via some other workflow)
        // to enforce the archetype's tier limits system-wide for this actor.
        const existingTierCount = (this.document.items?.contents ?? [])
            .filter(i => i.type === 'knack')
            .filter(i => Number(i.system?.tier ?? 0) === tier)
            .length;

        if (existingTierCount >= maxPurchasable) {
            ui.notifications.warn(`Tier ${tier} knack limit reached (${existingTierCount}/${maxPurchasable}).`);
            return;
        }

        // Deduplication: when the knack was originally sourced from a UUID (pack/world), we store it in flags.core.sourceId.
        // If present, use that to avoid creating duplicates.
        const existing = (this.document.items?.contents ?? [])
            .find(i => i.type === 'knack' && i.flags?.core?.sourceId === uuid);

        if (existing) {
            await existing.update({
                'system.tier': tier,
                [`flags.arkham-horror-rpg-fvtt.archetypeUuid`]: actorArchetypeUuid,
                [`flags.arkham-horror-rpg-fvtt.archetypeTier`]: tier
            });
            ui.notifications.info('Knack already owned; updated tier to match archetype.');
            return;
        }

        const source = await fromUuid(uuid);
        if (!source || source.type !== 'knack') {
            ui.notifications.warn('Could not resolve the source knack item.');
            return;
        }

        const itemData = foundry.utils.deepClone(source.toObject());
        delete itemData._id;
        itemData.system = itemData.system ?? {};
        itemData.system.tier = tier;
        itemData.flags = itemData.flags ?? {};
        itemData.flags.core = itemData.flags.core ?? {};
        itemData.flags.core.sourceId = uuid;
        itemData.flags['arkham-horror-rpg-fvtt'] = {
            ...(itemData.flags['arkham-horror-rpg-fvtt'] ?? {}),
            archetypeUuid: actorArchetypeUuid,
            archetypeTier: tier
        };

        // NOTE: v13 best practice is usually `this.document.createEmbeddedDocuments('Item', [itemData])`.
        // Leaving as-is for now.
        await ArkhamHorrorItem.create(itemData, { parent: this.document });
    }

    async _onDropItem(event, data) {
        try {
            const dropped = await Item.fromDropData(data);
            if (dropped?.type === 'archetype') {
                const updateData = {
                    'system.archetypeUuid': dropped.uuid,
                    'system.archetype': dropped.name
                };

                const skillCaps = dropped.system?.skillCaps ?? {};
                for (const skillKey of Object.keys(skillCaps)) {
                    // Ignore any unexpected keys which aren't actual actor skills.
                    if (!(skillKey in (this.document.system?.skills ?? {}))) continue;
                    const cap = Number(skillCaps?.[skillKey] ?? 0);
                    // Always overwrite the actor's max values from the newly-dropped archetype.
                    // Otherwise, switching archetypes can leave behind stale/manual caps from the previous archetype.
                    updateData[`system.skills.${skillKey}.max`] = Number.isFinite(cap) ? cap : 0;

                    // Only clamp current when an actual cap is present.
                    if (Number.isFinite(cap) && cap > 0) {
                        const current = Number(this.document.system?.skills?.[skillKey]?.current ?? 0);
                        if (Number.isFinite(current) && current > cap) {
                            updateData[`system.skills.${skillKey}.current`] = cap;
                        }
                    }
                }

                await this.document.update(updateData);
                ui.notifications.info(`Archetype set to ${dropped.name}.`);
                return;
            }
        } catch (e) {
            // Fall through to default handling
        }

        return super._onDropItem(event, data);
    }

    /* @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options)
        const actorData = this.document.toPlainObject();

        context.system = actorData.system;
        context.flags = actorData.flags;
        context.actor = this.document;

        // Adding a pointer to CONFIG.MISTENGINE
        //context.config = CONFIG.MISTENGINE;

        context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.document.system.biography,
            {
                // Whether to show secret blocks in the finished html
                secrets: this.document.isOwner,
                // Necessary in v11, can be removed in v12
                async: true,
                // Data to fill in for inline rolls
                rollData: this.document.getRollData(),
                // Relative UUID resolution
                relativeTo: this.document,
            }
        );

        context.firstSupernaturalEncounterHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.document.system.background.firstSupernaturalEncounter,
            {
                // Whether to show secret blocks in the finished html
                secrets: this.document.isOwner,
                // Necessary in v11, can be removed in v12
                async: true,
                // Data to fill in for inline rolls
                rollData: this.document.getRollData(),
                // Relative UUID resolution
                relativeTo: this.document,
            }
        );

        context.notableEnemiesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.document.system.background.notableEnemies,
            {
                // Whether to show secret blocks in the finished html
                secrets: this.document.isOwner,
                // Necessary in v11, can be removed in v12
                async: true,
                // Data to fill in for inline rolls
                rollData: this.document.getRollData(),
                // Relative UUID resolution
                relativeTo: this.document,
            }
        );

        let items = this._prepareItems();

        // is automatic calculation enabled of the load capacity?
        context.isAutoLoadCapacityEnabled  = game.settings.get("arkham-horror-rpg-fvtt", "characterLoadCapacity");

        foundry.utils.mergeObject(context, items);
        return context;
    }

    _prepareItems() {
        const knacks = [];
        let personalityTrait = null;
        const weapons = [];
        const protectiveEquipments = [];
        const usefulItems = [];
        const tomes = [];
        const relics = [];
        const injuries = [];
        const favors = [];
        const spells = [];

        let inventory = this.options.document.items;
        for (let i of inventory) {
            if (i.type === 'knack') {
                knacks.push(i);
            }
            else if (i.type === 'personality_trait') {
                personalityTrait = i;
            }
            else if (i.type === 'weapon') {
                weapons.push(i);
            }
            else if (i.type === 'protective_equipment') {
                protectiveEquipments.push(i);
            }
            else if (i.type === 'useful_item') {
                usefulItems.push(i);
            }
            else if (i.type === 'tome') {
                tomes.push(i);
            }
            else if (i.type === 'relic') {
                relics.push(i);
            }
            else if (i.type === 'injury' || i.type === 'trauma') {
                injuries.push(i);
            }
            else if (i.type === 'favor') {
                favors.push(i);
            }
            else if (i.type === 'spell') {
                spells.push(i);
            }
        }

        // sort knacks by tier
        knacks.sort((a, b) => a.system.tier - b.system.tier);

        // caluculate total weight of items
        if(game.settings.get("arkham-horror-rpg-fvtt", "characterLoadCapacity")){
            let totalWeight = 0;
            for (const item of inventory) {
                if(item.system.weight > 0){
                    totalWeight += item.system.weight * (item.system.quantity || 1);
                }
            }
            this.document.system.loadCapacity.current = totalWeight;
        }

        return { knacks: knacks, personalityTrait: personalityTrait, weapons: weapons, protectiveEquipments: protectiveEquipments, usefulItems: usefulItems, tomes: tomes, relics: relics, injuries: injuries,favors: favors,spells: spells  };
    }

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);

        const itemEditableStatsElements = this.element.querySelectorAll('.item-editable-stat')
        for (const input of itemEditableStatsElements) {
            input.addEventListener("change", event => this.handleItemStatChanged(event))
        }
    }

    async handleItemStatChanged(ev) {
        const li = $(ev.currentTarget).parents('.item');
        const item = this.actor.items.get(li.data('itemId'));

        if (ev.target.type === 'checkbox') {
            item.update({ [ev.target.dataset.itemStat]: ev.target.checked });
        } else {
            item.update({ [ev.target.dataset.itemStat]: ev.target.value });
        }
    }

    static async #handleClickedDicePool(event, target) {
        event.preventDefault();
        const element = event.currentTarget;
        const dieIndex = target.dataset.dieIndex;

        let newValue = dieIndex;
        if (newValue < 0) newValue = 0;
        this.actor.update({ 'system.dicepool.value': newValue });
    }

    static async #handleClickedClearDicePool(event, target) {
        event.preventDefault();
        this.actor.update({ 'system.dicepool.value': 0 });
    }

    static async #handleEditItem(event, target) {
        event.preventDefault();
        if (target.dataset.itemId == undefined) {
            const li = $(target).parents('.item');
            const item = this.options.document.items.get(li.data('itemId'))
            await item.sheet.render({ force: true });
        } else {
            const item = this.options.document.items.get(target.dataset.itemId)
            await item.sheet.render({ force: true });
        }
    }

    static async #handleCreateItem(event, target) {
        event.preventDefault();
        const actor = this.actor;
        this._onItemCreate(event, target, actor);
    }

    async _onItemCreate(event, target, actor) {
        event.preventDefault();

        // Get the type of item to create.
        const type = target.dataset.type;
        // Grab any data associated with this control.
        const data = duplicate(target.dataset);
        // Initialize a default name.
        const name = `New ${type.capitalize()}`;
        // Prepare the item object.

        const itemData = {
            name: name,
            type: type,
            system: data
        };
        // Remove the type from the dataset since it's in the itemData.type prop.
        delete itemData.system['type'];

        // Finally, create the item!
        return await ArkhamHorrorItem.create(itemData, { parent: actor });
    }

    static async #handleDeleteItem(event, target) {
        const li = $(target).parents('.item');
        if (target.dataset.itemId == undefined) {
            const item = this.actor.items.get(li.data('itemId'));
            item.delete();
            li.slideUp(200, () => this.render(false));
        } else {
            const item = this.options.document.items.get(target.dataset.itemId);
            item.delete();
            li.slideUp(200, () => this.render(false));
        }
    }

    static async #handleToggleFoldableContent(event, target) {
        event.preventDefault();
        const fcId = target.dataset.fcId;

        document.querySelectorAll(`.foldable-content[data-fc-id="${fcId}"]`).forEach(fcElement => {
            fcElement.classList.toggle('collapsed');
        });
    }

    static async #handleOpenActorArchetype(event, target) {
        event.preventDefault();
        await this.openActorArchetype(event, target);
    }

    async openActorArchetype(event, target) {
        const uuid = this.document.system?.archetypeUuid;
        if (!uuid) {
            ui.notifications.warn('This actor has no archetype set.');
            return;
        }

        try {
            const doc = await fromUuid(uuid);
            if (!doc) {
                ui.notifications.warn('Could not resolve actor archetype UUID.');
                return;
            }
            if (doc.type !== 'archetype') {
                ui.notifications.warn('The linked document is not an archetype.');
                return;
            }
            doc.sheet?.render(true);
        } catch (e) {
            ui.notifications.warn('Failed to open archetype.');
        }
    }

    static async #handleSkillClicked(event, target) {
        event.preventDefault();
        const skillKey = target.dataset.skillKey;

        let skillCurrent = this.actor.system.skills[skillKey].current;
        let skillMax = this.actor.system.skills[skillKey].max;
        let currentDicePool = this.actor.system.dicepool.value;
         DiceRollApp.getInstance({ actor: this.actor, skillKey: skillKey, skillCurrent: skillCurrent, skillMax: skillMax, currentDicePool: currentDicePool,weaponToUse: null }).render(true);
    }

    static async #handleWeaponReload(event, target) {
        event.preventDefault();
        const itemId = target.dataset.itemId;

        const item = this.actor.items.get(itemId);
        if (item) {
            const currentAmmo = item.system.ammunition.current;
            const maxAmmo = item.system.ammunition.max;

            if (currentAmmo < maxAmmo) {
                await item.update({ 'system.ammunition.current': maxAmmo });
                // update the money according to reload cost
                const reloadCost = item.system.reloadCost;
                const currentMoney = this.actor.system.mundaneResources.money;
                const newMoney = currentMoney - reloadCost;
                await this.actor.update({ 'system.mundaneResources.money': newMoney });
            }
        } else {
            console.error(`Item with ID ${itemId} not found on actor.`);
        }
    }

    static async #handleClickedRefreshDicePool(event, target) {
        let oldValue = this.actor.system.dicepool.value;
        let newValue = this.actor.system.dicepool.max - this.actor.system.damage;
        await this.actor.update({ 'system.dicepool.value': newValue });
        const chatVars = {
            label: 'Dicepool Refresh',
            actorName: this.actor.name,
            oldDicePoolValue: oldValue,
            newDicePoolValue: newValue
        };

        const html = await foundry.applications.handlebars.renderTemplate(
            "systems/arkham-horror-rpg-fvtt/templates/chat/dicepool-reset.hbs",
            chatVars
        );
        ChatMessage.create({
            content: html,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });

    }

    static async #handleClickedRollWithWeapon(event, target) {
        event.preventDefault();
        const itemId = target.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) {
            let skillKey = item.system.skill;
            let skillCurrent = this.actor.system.skills[skillKey].current;
            let skillMax = this.actor.system.skills[skillKey].max;
            let currentDicePool = this.actor.system.dicepool.value;
            DiceRollApp.getInstance({ actor: this.actor, skillKey: skillKey, skillCurrent: skillCurrent, skillMax: skillMax, currentDicePool: currentDicePool, weaponToUse: item }).render(true);
        } else {
            console.error(`Item with ID ${itemId} not found on actor.`);
        }
    }
}