const { ItemSheetV2 } = foundry.applications.sheets
const { HandlebarsApplicationMixin } = foundry.applications.api
const { TextEditor, DragDrop } = foundry.applications.ux
import { enrichHTML } from "../util/util.mjs"

export class ArkhamHorrorItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    #dragDrop // Private field to hold dragDrop handlers

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['arkham-horror-rpg-fvtt', 'sheet', 'item'],
        tag: 'form',
        position: {
            width: 600,
            height: 550
        },
        actions: {

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
            dropSelector: '.arkham-horror-rpg-fvtt.item'
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
        return context;
    }


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
        if ('link' in event.target.dataset) return;

        // Extract the data you need
        let dragData = null;

        if (!dragData) return;

        // Set data transfer
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
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

        //console.log(data.type);
        // Handle different data types
        switch (data.type) {
            // write your cases
        }

        return super._onDrop?.(event);
    }
}