import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorWeapon extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const requiredInteger = { required: true, nullable: false, integer: true };
    const requiredFloat = { required: true, nullable: false, integer: false };
    
    schema.skill = new fields.StringField({ required: true, blank: false, initial: "rangedCombat" });
    schema.damage = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.range = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.injuryRating = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.ammunition = new fields.SchemaField({
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      current: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
    });
    schema.cost = new fields.NumberField({ ...requiredFloat, initial: 0, min: 0 });
    schema.specialRules = new fields.StringField({ required: false, blank: true, initial: "" });
    schema.isRelic = new fields.BooleanField({ required: true, initial: false });

    return schema;
  }
}