import ArkhamHorrorDataModel from "./base-model.mjs";

export default class ArkhamHorrorActorBase extends ArkhamHorrorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    const DocumentUUIDField = fields.DocumentUUIDField ?? fields.StringField;

    schema.dicepool = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 6 })
    });

    schema.damage = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.horror = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.archetype = new fields.StringField({ required: true, blank: true });
    schema.archetypeUuid = new DocumentUUIDField({ required: false, nullable: true });

     schema.skills = new fields.SchemaField({
      agility: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      athletics: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      wits: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      presence: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      intuition: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      knowledge: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      resolve: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      meleeCombat: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      rangedCombat: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
      lore: new fields.SchemaField({
        current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 })
      }),
    });

    schema.biography = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields

    return schema;
  }

    prepareDerivedData() {
    this.dicepoolPrepared = [];
    let presentDicePoolMax = Math.max(0, this.dicepool.max - this.damage);

    // dice pool value is max presentDicepool max
    this.dicepool.value = Math.min(this.dicepool.value,presentDicePoolMax);

    for (let i = 1; i <= presentDicePoolMax; i++) {
      let isHorrorDice = (i <= this.horror);
      this.dicepoolPrepared.push({ index: i, max: presentDicePoolMax, used: i > this.dicepool.value,isHorrorDice:isHorrorDice });
    }
  }
}