import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorUsefulItem extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.specialRules = new fields.StringField({ required: true, blank: true });
    schema.cost = new fields.NumberField({ required: true, nullable: false, integer: false, initial: 0, min: 0 });
    schema.uses = new fields.SchemaField({
      max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      current: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })
    });
    
    return schema;
  }
}