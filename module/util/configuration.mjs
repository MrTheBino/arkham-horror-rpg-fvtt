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

    game.settings.register("arkham-horror-rpg-fvtt", "characterLoadCapacity", {
        name: "Character Load Capacity",
        hint: "Automatic Load Capacity calculation",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("arkham-horror-rpg-fvtt", "characterInjuryTable", {
        name: "Character Injury Table",
        hint: "Used for rolling injuries",
        scope: "world",
        config: true,
        type: String,
        choices: () => {
            const tables = {};
            for (const table of game.tables) {
                tables[table.id] = table.name;
            }
            return tables;
        },
        default: ""
    });
    game.settings.register("arkham-horror-rpg-fvtt", "characterHorrorTable", {
        name: "Character Horror Table",
        hint: "Used for rolling horror",
        scope: "world",
        config: true,
        type: String,
        choices: () => {
            const tables = {};
            for (const table of game.tables) {
                tables[table.id] = table.name;
            }
            return tables;
        },
        default: ""
    });

    game.settings.register("arkham-horror-rpg-fvtt", "npcInjuryTable", {
        name: "NPC Injury Table",
        hint: "Used for rolling injuries",
        scope: "world",
        config: true,
        type: String,
        choices: () => {
            const tables = {};
            for (const table of game.tables) {
                tables[table.id] = table.name;
            }
            return tables;
        },
        default: ""
    });
    game.settings.register("arkham-horror-rpg-fvtt", "npcHorrorTable", {
        name: "NPC Horror Table",
        hint: "Used for rolling horror",
        scope: "world",
        config: true,
        type: String,
        choices: () => {
            const tables = {};
            for (const table of game.tables) {
                tables[table.id] = table.name;
            }
            return tables;
        },
        default: ""
    });
}