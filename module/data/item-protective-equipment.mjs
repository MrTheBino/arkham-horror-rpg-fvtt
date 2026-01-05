import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorProtectiveEquipment extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.defensiveBenefit = new fields.StringField({ required: true, blank: true });
    schema.specialRules = new fields.StringField({ required: true, blank: true });
    schema.cost = new fields.NumberField({ required: true, nullable: false, integer: false, initial: 0, min: 0 });
    
    return schema;
  }
}