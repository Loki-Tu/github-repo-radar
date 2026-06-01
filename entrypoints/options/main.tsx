import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  I18nContext,
  getLocale,
  getSavedLang,
  setSavedLang,
  type Lang,
} from "../../utils/i18n";
import App from "./App";
import "../popup/styles/globals.css";

function Root() {
  const [lang, setLang] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSavedLang().then((l) => {
      setLang(l);
      setReady(true);
    });
  }, []);

  const handleLangChange = async (newLang: Lang) => {
    setLang(newLang);
    await setSavedLang(newLang);
  };

  if (!ready) return null;

  return (
    <I18nContext.Provider value={getLocale(lang)}>
      <App lang={lang} onLangChange={handleLangChange} />
    </I18nContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
