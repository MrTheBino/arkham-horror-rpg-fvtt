import ArkhamHorrorActorBase from "./base-actor.mjs";

export default class ArkhamHorrorCharacter extends ArkhamHorrorActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

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

    schema.insight = new fields.SchemaField({
      limit: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      remaining: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    schema.xp = new fields.SchemaField({
      total: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      unused: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    schema.dicepool = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 6 })
    });

    schema.archetype = new fields.StringField({ required: true, blank: true });

    schema.background = new fields.SchemaField({
      placeOfOrigin: new fields.StringField({ required: false, blank: true }),
      familyAndFriends: new fields.StringField({ required: false, blank: true }),
      employment: new fields.StringField({ required: false, blank: true }),
      weeklySalary: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      firstSupernaturalEncounter: new fields.StringField({ required: false, blank: true }),
      notableEnemies: new fields.StringField({ required: false, blank: true })
    });

    schema.mundaneResources = new fields.SchemaField({
      money: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      vehicle: new fields.StringField({ required: false, blank: true }),
      lodging: new fields.StringField({ required: false, blank: true })
    });

    schema.supernaturalResources = new fields.SchemaField({
      eldritchDebtOrFavor1: new fields.StringField({ required: false, blank: true }),
      eldritchDebtOrFavor2: new fields.StringField({ required: false, blank: true })
    });
    return schema;
  }

  prepareDerivedData() {
    this.dicepoolPrepared = [];
    for (let i = 1; i <= this.dicepool.max; i++) {
      this.dicepoolPrepared.push({ index: i, max: this.dicepool.max, used: i > this.dicepool.value });
    }
  }

  getRollData() {
    const data = {};



    return data
  }
}