//本地化

import { invoke } from "@tauri-apps/api/core";
import { t } from "i18next";
import i18n from "../../services/i18n";
import { roConfig } from "../../services/config";
import { hooks } from "../../services/hook";

async function setLocalized(lang: string) {
    lang = lang.toLowerCase()

    hooks.setLocaleStr(getLangCode(lang))

    i18n.changeLanguage(lang)
    await invoke('set_localized', {
        localizedData: {
            quit: t("quit"),
            show: t("tray_show"),
            hide: t("tray_hide")
        }
    })
}

function getLangCode(lang: string): string {
    for (const value of roConfig.options.setting.language.select) {
        if (lang === value.value) {
            return value.langCode
        }
    }
    return roConfig.options.setting.language.select[roConfig.options.setting.language.defIndex].langCode
}

export { setLocalized, getLangCode }