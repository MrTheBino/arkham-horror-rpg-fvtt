import ArkhamHorrorDataModel from "./base-model.mjs";

export default class ArkhamHorrorItemBase extends ArkhamHorrorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });
    schema.weight = new fields.NumberField({ required: false, default: 0, min: 0 });
    schema.quantity = new fields.NumberField({ required: false, default: 1, min: 1 });

    return schema;
  }

}