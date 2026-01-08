import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorFavor extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const requiredInteger = { required: true, nullable: false, integer: true };
    
    schema.xp = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.benefit = new fields.StringField({ required: true, nullable: false, initial: "" });
    schema.decliningText = new fields.StringField({ required: false, nullable: true, initial: "" });
    schema.losingText = new fields.StringField({ required: false, nullable: true, initial: "" });

    return schema;
  }
}