//本地化

import { invoke } from "@tauri-apps/api/core";
import i18n from "../../services/i18n";
import { roConfig } from "../../services/config";
import { hooks } from "../../services/hook";

async function setLocalized(lang: string) {
  lang = lang.toLowerCase();
  
  const pack: Record<string, string> = await invoke("get_language_pack"); 
  i18n.addResourceBundle(lang, "translation", pack)
  i18n.changeLanguage(lang);
  hooks.setLocaleStr(getLangCode(lang));
}

function getLangCode(lang: string): string {
  for (const value of roConfig.options.setting.language.select) {
    if (lang === value.value) {
      return value.langCode;
    }
  }
  const select = roConfig.options.setting.language.select[roConfig.options.setting.language.defIndex];
  return select?.langCode ?? 'en';
}

export { setLocalized, getLangCode };
