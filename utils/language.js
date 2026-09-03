const language = {};

function setLanguage(chatId, lang) {
  language[chatId] = lang;
}

function getLanguage(chatId) {
  return language[chatId] || "mm";
}

module.exports = {
  setLanguage,
  getLanguage
};
