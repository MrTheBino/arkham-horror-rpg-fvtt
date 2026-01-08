export function setupConfiguration() {
    game.settings.register("arkham-horror-rpg-fvtt", "tokenShowDicePools", {
        name: "Show Token Dice Pools",
        hint: "Show Dice Pool below tokens on the canvas.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("arkham-horror-rpg-fvtt", "tokenShowDamage", {
        name: "Show Token Damage",
        hint: "Show Damage below tokens on the canvas.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
}