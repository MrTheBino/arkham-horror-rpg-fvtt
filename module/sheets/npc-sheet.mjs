const { ActorSheetV2 } = foundry.applications.sheets
const { HandlebarsApplicationMixin } = foundry.applications.api
const { TextEditor, DragDrop } = foundry.applications.ux
import { ArkhamHorrorItem } from "../documents/item.mjs";
import { DiceRollApp } from '../apps/dice-roll-app.mjs';

export class ArkhamHorrorNpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    #dragDrop // Private field to hold dragDrop handlers

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['sheet', 'actor', 'npc'],
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
            clickSkill: this.#handleSkillClicked,
            clickWeaponReload: this.#handleWeaponReload
        },
        form: {
            submitOnChange: true
        },
        actor: {
            type: 'character'
        },
        dragDrop: [{
            dragSelector: '[draggable="true"]',
            dropSelector: '.mist-engine.actor'
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
            template: 'systems/arkham-horror-rpg-fvtt/templates/npc/parts/npc-header.hbs'
        },
        tabs: {
            id: 'tabs',
            template: 'templates/generic/tab-navigation.hbs'
        },
        npc: {
            id: 'npc',
            template: 'systems/arkham-horror-rpg-fvtt/templates/npc/parts/npc-main.hbs',
            scrollable: ['']
        },
        biography: {
            id: 'biography',
            template: 'systems/arkham-horror-rpg-fvtt/templates/shared/tab-biography.hbs'
        },
    }

    /**
 * Define the structure of tabs used by this sheet.
 * @type {Record<string, ApplicationTabsConfiguration>}
 */
    static TABS = {
        sheet: { // this is the group name
            tabs:
                [
                    { id: 'npc', label: 'TABS.NPC', group: 'sheet' },
                    { id: 'biography', label: 'TABS.Biography', group: 'sheet' }
                ],
            initial: 'npc'
        }
    }

    constructor(options = {}) {
        super(options)
        //this.#dragDrop = this.#createDragDropHandlers()
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

        context.abilitiesDescriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.document.system.abilitiesDescription,
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
        }

        // sort knacks by tier
        knacks.sort((a, b) => a.system.tier - b.system.tier);

        return { knacks: knacks, personalityTrait: personalityTrait, weapons: weapons, protectiveEquipments: protectiveEquipments, usefulItems: usefulItems, tomes: tomes, relics: relics, injuries: injuries };
    }

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);

        const itemEditableStatsElements = this.element.querySelectorAll('.item-editable-stat')
        for (const input of itemEditableStatsElements) {
            input.addEventListener("change", event => this.handleItemStatChanged(event))
        }
    }

    static async #handleClickedDicePool(event, target) {
        event.preventDefault();
        const element = event.currentTarget;
        const dieIndex = target.dataset.dieIndex;
        console.log(dieIndex);
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

    static async #handleSkillClicked(event, target) {
        event.preventDefault();
        const skillKey = target.dataset.skillKey;
        console.log(`Skill clicked: ${skillKey}`);

        let skillCurrent = this.actor.system.skills[skillKey].current;
        let skillMax = this.actor.system.skills[skillKey].max;
        let currentDicePool = this.actor.system.dicepool.value;
        console.log(`Current Skill: ${skillCurrent}, Max Skill: ${skillMax}, Current Dice Pool: ${currentDicePool}`);
        DiceRollApp.getInstance({ actor: this.actor, skillKey: skillKey, skillCurrent: skillCurrent, skillMax: skillMax, currentDicePool: currentDicePool }).render(true);
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
            } 
        } else {
            console.error(`Item with ID ${itemId} not found on actor.`);
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
}