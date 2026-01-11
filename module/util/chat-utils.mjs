// simplifys calling the Handlebars template renderer for chat messages allows easy updates if this moves around in the API in the future.
export async function renderChatHtml(templatePath, chatVars) {
  return foundry.applications.handlebars.renderTemplate(templatePath, chatVars);
}
// applies the roll mode to the chat data respecticting default foundry selectors and posts the message
export async function applyChatModeAndPost(chatData, { rollMode = "roll" } = {}) {
  const dataWithMode = ChatMessage.applyRollMode({ ...chatData }, rollMode);
  return ChatMessage.create(dataWithMode);
}

// combines rendering and posting into a single function for Arkham Horror RPG chat cards
// applies all chat data flags as well
export async function createArkhamHorrorChatCard({ actor, template, chatVars, flags = {} }, options) {
  const content = await renderChatHtml(template, chatVars);
  return applyChatModeAndPost({ 
    content, 
    speaker: ChatMessage.getSpeaker({ actor: actor }), 
    flags },
     options);
}
