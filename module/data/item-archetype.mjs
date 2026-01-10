import ArkhamHorrorItemBase from "./base-item.mjs";

export default class ArkhamHorrorArchetype extends ArkhamHorrorItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const requiredInteger = { required: true, nullable: false, integer: true };
    const requiredTier = { required: true, nullable: false, integer: true, min: 1, max: 4 };

    const DocumentUUIDField = fields.DocumentUUIDField ?? fields.StringField;

    schema.sourceBook = new fields.StringField({ required: true, nullable: false, blank: true, initial: "" });

    schema.skillCaps = new fields.SchemaField({
      agility: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      athletics: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      wits: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      presence: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      intuition: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      knowledge: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      resolve: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      meleeCombat: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      rangedCombat: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      lore: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
    });

    schema.knackTiers = new fields.SchemaField({
      1: new fields.SchemaField({
        maxPurchasable: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        xpcost: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        allowedKnacks: new fields.ArrayField(new fields.SchemaField({
          uuid: new DocumentUUIDField({ required: true, nullable: false, blank: false }),
          tier: new fields.NumberField({ ...requiredTier, initial: 1 })
        }))
      }),
      2: new fields.SchemaField({
        maxPurchasable: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        xpcost: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        allowedKnacks: new fields.ArrayField(new fields.SchemaField({
          uuid: new DocumentUUIDField({ required: true, nullable: false, blank: false }),
          tier: new fields.NumberField({ ...requiredTier, initial: 2 })
        }))
      }),
      3: new fields.SchemaField({
        maxPurchasable: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        xpcost: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        allowedKnacks: new fields.ArrayField(new fields.SchemaField({
          uuid: new DocumentUUIDField({ required: true, nullable: false, blank: false }),
          tier: new fields.NumberField({ ...requiredTier, initial: 3 })
        }))
      }),
      4: new fields.SchemaField({
        maxPurchasable: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        xpcost: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        allowedKnacks: new fields.ArrayField(new fields.SchemaField({
          uuid: new DocumentUUIDField({ required: true, nullable: false, blank: false }),
          tier: new fields.NumberField({ ...requiredTier, initial: 4 })
        }))
      })
    });

    return schema;
  }

}
