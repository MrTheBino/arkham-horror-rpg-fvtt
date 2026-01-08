import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorSpell extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.specialRules = new fields.StringField({ required: false, blank: true, initial: "" });

    return schema;
  }
}