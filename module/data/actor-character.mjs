import ArkhamHorrorActorBase from "./base-actor.mjs";

export default class ArkhamHorrorCharacter extends ArkhamHorrorActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.insight = new fields.SchemaField({
      limit: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      remaining: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    schema.xp = new fields.SchemaField({
      total: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      unused: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    schema.loadCapacity = new fields.SchemaField({
      max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      current: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

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
    super.prepareDerivedData();
  }

  getRollData() {
    const data = {};



    return data
  }
}