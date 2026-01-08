export async function enrichHTML(key, document) {
    await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        foundry.utils.getProperty(document.system, key),
        {
            // Whether to show secret blocks in the finished html
            secrets: document.isOwner,
            // Necessary in v11, can be removed in v12
            async: true,
            // Data to fill in for inline rolls
            rollData: document.getRollData(),
            // Relative UUID resolution
            relativeTo: document,
        }
    );
}