import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorKnack extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const requiredInteger = { required: true, nullable: false, integer: true };
    
    schema.tier = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });

    return schema;
  }
}