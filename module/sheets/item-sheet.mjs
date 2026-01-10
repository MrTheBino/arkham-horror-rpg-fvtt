const { ItemSheetV2 } = foundry.applications.sheets
const { HandlebarsApplicationMixin } = foundry.applications.api
const { TextEditor, DragDrop } = foundry.applications.ux
import { enrichHTML } from "../util/util.mjs"

export class ArkhamHorrorItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    #dragDrop // Private field to hold dragDrop handlers
    #dragDropBoundElement

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['arkham-horror-rpg-fvtt', 'sheet', 'item'],
        tag: 'form',
        position: {
            width: 600,
            height: 550
        },
        actions: {
            removeArchetypeKnack: this.#handleRemoveArchetypeKnack,
            toggleFoldableContent: this.#handleToggleFoldableContent,
            openUuidItem: this.#handleOpenUuidItem
        },
        form: {
            // handler: DCCActorSheet.#onSubmitForm,
            submitOnChange: true
        },
        actor: {
            type: 'item'
        },
        dragDrop: [{
            dragSelector: '[draggable="true"]',
            // Bind drop handling broadly, then validate the actual tier in `_onDrop`.
            // This avoids brittle selector/event-target quirks that can make some tiers hard to drop onto.
            dropSelector: '*'
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
            template: 'systems/arkham-horror-rpg-fvtt/templates/item/parts/item-header.hbs'
        },
        tabs: {
            // Foundry-provided generic template
            template: 'templates/generic/tab-navigation.hbs',
            // classes: ['sysclass'], // Optionally add extra classes to the part for extra customization
        },
        form: {
            template: 'systems/arkham-horror-rpg-fvtt/templates/item/item-sheet.hbs'
        },
        description: {
            template: 'systems/arkham-horror-rpg-fvtt/templates/shared/tab-description.hbs',
            id: 'description',
            scrollable: ['scrollable']
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
                    { id: 'form', group: 'sheet', label: 'ARKHAM_HORROR.LABELS.Form' },
                    { id: 'description', group: 'sheet', label: 'ARKHAM_HORROR.LABELS.Description' },
                ],
            initial: 'form'
        }
    }

    constructor(options = {}) {
        super(options)
        this.#dragDrop = this.#createDragDropHandlers()
    }

    /** @inheritDoc */
    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options)

        let templatePath = `systems/arkham-horror-rpg-fvtt/templates/item/item-${this.document.type}-sheet.hbs`;
        // Add the main item type part
        if (this.document.type) {
            parts.form = {
                id: 'form',
                template: templatePath
            }
        }
        return parts;
    }

    /* @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options)
        const actorData = this.document.toPlainObject();

        context.system = actorData.system;
        context.flags = actorData.flags;
        context.item = this.document;

        // Adding a pointer to CONFIG.SHADOWCITY
        context.config = CONFIG.SHADOWCITY;

        context.descriptionHTML = await enrichHTML('system.description',this.document);

        if (actorData.system.specialRules) {
            context.specialRulesHTML = await enrichHTML('system.specialRules',this.document);
            console.log("done");
        }

        if(actorData.system.defensiveBenefit){
             context.defensiveBenefitHTML = await enrichHTML('system.defensiveBenefit',this.document);
        }

        if(actorData.system.negative){
             context.negativeHTML = await enrichHTML('system.negative',this.document);
        }

        if(actorData.system.positive){
             context.positiveHTML = await enrichHTML('system.positive',this.document);
        }

        if(actorData.system.positive){
             context.positiveHTML = await enrichHTML('system.positive',this.document);
        }
        if(actorData.system.benefit){
             context.benefitHTML = await enrichHTML('system.benefit',this.document);
        }
        if(actorData.system.decliningText){
             context.decliningTextHTML = await enrichHTML('system.decliningText',this.document);
        }
        if(actorData.system.losingText){
             context.losingTextHTML = await enrichHTML('system.losingText',this.document);
        }

        if (this.document.type === 'archetype') {
            context.isGM = game.user?.isGM ?? false;
            context.skillCapKeys = Object.keys(context.system?.skillCaps ?? {});

            const allKnacks = await this.#getAvailableKnacks();
            const knackMap = new Map(allKnacks.map(k => [k.uuid, k]));
            const docByUuid = new Map();
            const descriptionByUuid = new Map();

            const buildTier = async (tierNumber) => {
                const tierData = this.document.system.knackTiers?.[tierNumber] ?? {};
                const normalized = (tierData.allowedKnacks ?? []).filter(e => e?.uuid);

                const resolved = [];
                for (const entry of normalized) {
                    const known = knackMap.get(entry.uuid);

                    let name = known?.name ?? entry.uuid;
                    let sourceLabel = known?.sourceLabel ?? 'Unknown';

                    let doc = docByUuid.get(entry.uuid);
                    if (!docByUuid.has(entry.uuid)) {
                        try {
                            doc = await fromUuid(entry.uuid);
                        } catch (e) {
                            doc = null;
                        }
                        docByUuid.set(entry.uuid, doc ?? null);
                    }

                    if (doc) {
                        name = doc.name ?? name;
                        sourceLabel = doc.pack ? (game.packs.get(doc.pack)?.metadata?.label ?? doc.pack) : (game.world?.title ?? 'World');
                    }

                    let descriptionHTML = descriptionByUuid.get(entry.uuid);
                    if (descriptionHTML === undefined) {
                        descriptionHTML = doc ? await enrichHTML('system.description', doc) : '';
                        descriptionByUuid.set(entry.uuid, descriptionHTML);
                    }

                    resolved.push({
                        uuid: entry.uuid,
                        name,
                        tier: Number(entry.tier ?? tierNumber),
                        sourceLabel,
                        descriptionHTML
                    });
                }

                return {
                    maxPurchasable: tierData.maxPurchasable ?? 0,
                    xpcost: tierData.xpcost ?? 0,
                    allowedKnacks: resolved
                };
            };
            context.knackTiers = {
                "1": await buildTier(1),
                "2": await buildTier(2),
                "3": await buildTier(3),
                "4": await buildTier(4)
            };
        }
        return context;
    }

    static async #handleRemoveArchetypeKnack(event, target) {
        this.removeArchetypeKnack(event, target);
    }

    static async #handleToggleFoldableContent(event, target) {
        this.toggleFoldableContent(event, target);
    }

    static async #handleOpenUuidItem(event, target) {
        this.openUuidItem(event, target);
    }

    toggleFoldableContent(event, target) {
        event.preventDefault();
        const fcId = target.dataset.fcId;
        if (!fcId) return;
        this.element.querySelectorAll(`.foldable-content[data-fc-id="${fcId}"]`).forEach(fcElement => {
            fcElement.classList.toggle('collapsed');
        });
    }

    async openUuidItem(event, target) {
        event.preventDefault();
        // Archetype knacks are UUID references (not embedded). Opening their sheets for players is risky because it
        // can lead to editing the source document (world/compendium) rather than an owned copy.
        if (this.document.type === 'archetype' && !(game.user?.isGM ?? false)) {
            ui.notifications.warn('Only the GM can open/edit source Knack documents from an Archetype.');
            return;
        }
        const uuid = target.dataset.uuid;
        if (!uuid) return;

        try {
            const doc = await fromUuid(uuid);
            if (!doc) {
                ui.notifications.warn('Could not resolve the dropped UUID.');
                return;
            }
            if (doc.sheet) {
                doc.sheet.render(true);
                return;
            }
            ui.notifications.warn('No sheet available for that document.');
        } catch (e) {
            ui.notifications.warn('Failed to open the UUID document.');
        }
    }

    async removeArchetypeKnack(event, target) {
        event.preventDefault();
        if (this.document.type !== 'archetype') return;
        if (!(game.user?.isGM ?? false)) {
            ui.notifications.warn('Only the GM can modify an Archetype\'s allowed Knacks.');
            return;
        }

        const tier = Number(target.dataset.tier);
        const uuid = target.dataset.uuid;
        if (!tier || !uuid) return;

        const structuredPath = `system.knackTiers.${tier}.allowedKnacks`;
        const currentStructured = foundry.utils.getProperty(this.document, structuredPath) ?? [];
        const nextStructured = currentStructured.filter(e => e?.uuid !== uuid);

        await this.document.update({ [structuredPath]: nextStructured });
        this.render(false);
    }

    async #addKnackUuidToTier(tier, uuid) {
        if (!(game.user?.isGM ?? false)) {
            ui.notifications.warn('Only the GM can modify an Archetype\'s allowed Knacks.');
            return;
        }
        const structuredPath = `system.knackTiers.${tier}.allowedKnacks`;

        const currentStructured = foundry.utils.getProperty(this.document, structuredPath) ?? [];

        if (currentStructured.some(e => e?.uuid === uuid)) {
            ui.notifications.info("Knack already added to this tier.");
            return;
        }

        await this.document.update({ [structuredPath]: [...currentStructured, { uuid, tier }] });
    }

    async #getAvailableKnacks() {
        const knacks = [];

        // World items
        for (const item of (game.items?.contents ?? [])) {
            if (item.type !== 'knack') continue;
            knacks.push({
                uuid: item.uuid,
                name: item.name,
                tier: Number(item.system?.tier ?? 0),
                sourceLabel: game.world?.title ?? 'World'
            });
        }

        // Compendiums
        for (const pack of (game.packs?.values?.() ?? [])) {
            if (pack.documentName !== 'Item') continue;
            const index = await pack.getIndex({ fields: ['type', 'name', 'system.tier'] });
            for (const entry of index) {
                if (entry.type !== 'knack') continue;
                const uuid = `Compendium.${pack.collection}.${entry._id}`;
                knacks.push({
                    uuid,
                    name: entry.name,
                    tier: Number(entry.system?.tier ?? 0),
                    sourceLabel: pack.metadata?.label ?? pack.collection
                });
            }
        }

        knacks.sort((a, b) => {
            if (a.tier !== b.tier) return a.tier - b.tier;
            const an = (a.name ?? '').toLowerCase();
            const bn = (b.name ?? '').toLowerCase();
            if (an < bn) return -1;
            if (an > bn) return 1;
            return (a.sourceLabel ?? '').localeCompare(b.sourceLabel ?? '');
        });

        return knacks;
    }

    // NOTE: legacy resolution helpers were removed (no migration support).


    /** @override */
    async _processSubmitData(event, form, formData) {
        // Process the actor data normally
        const result = await super._processSubmitData(event, form, formData)
        return result
    }

    /**
  * Create drag-and-drop workflow handlers for this Application
  * @returns {DragDrop[]} An array of DragDrop handlers
  * @private
  */
    #createDragDropHandlers() {
        return this.options.dragDrop.map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this)
            }
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this)
            }
            return new DragDrop(d)
        })
    }

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param {string} selector       The candidate HTML selector for dragging
     * @returns {boolean}             Can the current user drag this selector?
     * @protected
     */
    _canDragStart(selector) {
        // game.user fetches the current user
        return this.isEditable;
    }


    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param {string} selector       The candidate HTML selector for the drop target
     * @returns {boolean}             Can the current user drop on this selector?
     * @protected
     */
    _canDragDrop(selector) {
        // game.user fetches the current user
        return this.isEditable;
    }


    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    _onDragStart(event) {
        const el = event.currentTarget;
        if (!event.dataTransfer) return;
        if ('link' in event.target.dataset) return;

        let dragData = null;

        // Dragging a knack entry from an Archetype tier list onto an Actor sheet
        if (el?.dataset?.dragType === 'archetype-knack') {
            const uuid = el.dataset.uuid;
            const tier = Number(el.dataset.tier);
            if (!uuid || !tier) return;

            dragData = {
                type: 'ArkhamHorrorArchetypeKnack',
                uuid,
                tier,
                archetypeUuid: this.document.uuid
            };
        }

        if (!dragData) return;

        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        event.dataTransfer.effectAllowed = 'copy';
    }


    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    _onDragOver(event) { }


    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        // Archetype: only store UUID references to dropped knacks (no embedding)
        if (this.document.type === 'archetype' && data?.type === 'Item') {
            if (!(game.user?.isGM ?? false)) {
                ui.notifications.warn('Only the GM can modify an Archetype.');
                return;
            }

            const tierEl = event.target?.closest?.('.archetype-tier-drop')
                ?? event.currentTarget?.closest?.('.archetype-tier-drop');
            const tier = Number(tierEl?.dataset?.archetypeTier);
            if (!tier) {
                ui.notifications.warn('Drop the Knack onto a specific tier section.');
                return;
            }

            const dropped = await Item.fromDropData(data);
            if (!dropped || dropped.type !== 'knack') {
                ui.notifications.warn('Only Knack items can be dropped onto an Archetype.');
                return;
            }

            await this.#addKnackUuidToTier(tier, dropped.uuid);
            this.render(false);
            return;
        }

        //console.log(data.type);
        // Handle different data types
        switch (data.type) {
            // write your cases
        }

        return super._onDrop?.(event);
    }

    /** @inheritDoc */
    _onRender(context, options) {
        super._onRender(context, options);
        if (this.#dragDropBoundElement !== this.element) {
            for (const dd of (this.#dragDrop ?? [])) dd.bind(this.element);
            this.#dragDropBoundElement = this.element;
        }
    }
}