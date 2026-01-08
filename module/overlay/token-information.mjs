export const TokenInformationOverlay = (() => {

    // If true: hide when value is 0 (often useful). Set false to show 0.
    const HIDE_ZERO = false;

    function getDicePoolValueFromActor(actor) {
        if (!actor) return null;
        const value = foundry.utils.getProperty(actor, "system.dicepool.value");

        if (value === undefined || value === null || value === "") return null;
        if (typeof value === "number" && Number.isNaN(value)) return null;

        if (HIDE_ZERO && (value === 0 || value === "0")) return null;
        return value;
    }

    function getDamageValueFromActor(actor) {
        if (!actor) return null;
        const value = foundry.utils.getProperty(actor, "system.damage");

        if (value === undefined || value === null || value === "") return null;
        if (typeof value === "number" && Number.isNaN(value)) return null;

        if (HIDE_ZERO && (value === 0 || value === "0")) return null;
        return value;
    }

    function ensureText(token) {
        // token is a Token (placeable) instance
        if (!token) return null;

        // Reuse existing PIXI text object if already created
        if (token._mySystemNumberText && token._mySystemNumberText.destroyed !== true) return token._mySystemNumberText;

        const style = new PIXI.TextStyle({
            fontFamily: "MODESTO CONDENSED, sans-serif",
            fontSize: 32,
            fontWeight: "700",
            fill: 0xFFFFFF,
            stroke: 0x000000,
            strokeThickness: 4
        });

        const txt = new PIXI.Text("", style);
        txt.anchor.set(0.5, 0); // center horizontally; y anchored at top
        txt.zIndex = 1000;
        txt.visible = false;

        token.addChild(txt);
        token._mySystemNumberText = txt;

        return txt;
    }

    function positionText(token, txt) {
        const pad = 3;
        txt.x = token.w / 2;
        txt.y = token.h + pad;
    }

    function update(token) {
        // token is a Token placeable
        const txt = ensureText(token);
        if (!txt) return;

        if(!game.settings.get("arkham-horror-rpg-fvtt", "tokenShowDicePools") &&
           !game.settings.get("arkham-horror-rpg-fvtt", "tokenShowDamage")) {
            txt.visible = false;
            txt.text = "";
            return;
        }

        const actor = token.actor; // live actor
        const dicepoolValue = getDicePoolValueFromActor(actor);
        const damageValue = getDamageValueFromActor(actor);

        if (dicepoolValue === null) {
            txt.visible = false;
            txt.text = "";
            return;
        }

        txt.text = "";

        if(game.settings.get("arkham-horror-rpg-fvtt", "tokenShowDicePools")) {
            txt.text += `DP: ${String(dicepoolValue)}`;
        }

        if(game.settings.get("arkham-horror-rpg-fvtt", "tokenShowDamage")) {
            txt.text += ` DMG: ${String(damageValue)}`;
        }

        txt.visible = true;
        positionText(token, txt);
    }

    function updateAll() {
        canvas.tokens?.placeables?.forEach(update);
    }

    function registerHooks() {
        // When canvas is ready, create/update all overlays
        Hooks.on("canvasReady", () => updateAll());

        // When a token refreshes (movement, redraw, etc.), reposition and update
        Hooks.on("refreshToken", (token) => update(token));

        // When an Actor updates, update all tokens that reference that actor
        Hooks.on("updateActor", (actor) => {
            if (!canvas?.ready) return;
            for (const token of canvas.tokens.placeables) {
                if (token.actor?.id === actor.id) update(token);
            }
        });

        // When a TokenDocument updates (size changes etc.), update its placeable
        Hooks.on("updateToken", (doc) => {
            if (!canvas?.ready) return;
            const token = canvas.tokens?.get(doc.id);
            if (token) update(token);
        });
    }

    return { registerHooks, updateAll };
})();