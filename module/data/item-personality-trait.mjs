import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorKnack extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.positive = new fields.StringField({ required: true, blank: true });
    schema.negative = new fields.StringField({ required: true, blank: true });
    
    return schema;
  }
}