// simplifys calling the Handlebars template renderer for chat messages allows easy updates if this moves around in the API in the future.
export async function renderChatHtml(templatePath, chatVars) {
  return foundry.applications.handlebars.renderTemplate(templatePath, chatVars);
}

// One place to handle top level chat message creation
export async function postChatMessage({ actor, html }) {
  return ChatMessage.create({
    content: html,
    speaker: ChatMessage.getSpeaker({ actor: actor }),
  });
}