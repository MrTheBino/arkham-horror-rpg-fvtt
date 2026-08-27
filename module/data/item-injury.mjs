import ArkhamHorrorItemBase from "./base-item.mjs";
import { ROLL_EFFECT_MODIFIERS, rollEffectsField } from "./fields/roll-effects.mjs";

export default class ArkhamHorrorInjury extends ArkhamHorrorItemBase {

    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = super.defineSchema();

        const requiredInteger = { required: true, nullable: false, integer: true };

        // Allows future automation (e.g., knacks) to temporarily disable an injury without deleting it.
        schema.active = new fields.BooleanField({ required: true, nullable: false, initial: true });

        // The status effect applied to the owning actor while an injury item is active on the actor.
        // Currently these effects have no mechanical effect, but they are visible on the token on the canvas and can be used for automation.
        schema.statusEffectId = new fields.StringField({ required: true, nullable: false, blank: true, initial: "" });

        // Successes needed to heal this injury (core p. 33-34): 1 by default, 2 for Severely
        // Injured / Loss of a Sense / Comatose, 3 for Dire. The value is also derivable from the
        // printed text ("requires two successes to heal"), which `helpers/healing.mjs` falls back
        // to for compendium items that predate this field.
        schema.healDifficulty = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1, max: 3 });

        // Core p. 34: injuries heal on their own given enough time — except Dire. That exception is
        // only in the rules text, never at the item, so it has to be maintained explicitly.
        schema.canHealNaturally = new fields.BooleanField({ required: true, nullable: false, initial: true });

        // Roll effects: automatic penalties applied to matching skill rolls.
        schema.rollEffects = rollEffectsField({ modifiers: ROLL_EFFECT_MODIFIERS.penalty });

        return schema;
    }
}
