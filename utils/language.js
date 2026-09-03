const language = {};

function setLanguage(chatId, lang) {
    language[chatId] = lang;
}

function getLanguage(chatId) {
    return language[chatId] || "mm";
}

function text(chatId, mm, en) {
    return getLanguage(chatId) === "mm" ? mm : en;
}

module.exports = {
    setLanguage,
    getLanguage,
    text
};
