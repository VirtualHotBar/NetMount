import { nmConfig } from "../../services/config";

// 设置颜色模式
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {//监听
    nmConfig.settings.themeMode === 'auto' && setThemeMode(nmConfig.settings.themeMode)
});
 function setThemeMode(mode: 'dark' | 'light' | 'auto' | string): void {
    const body = document.body;
    let isDarkMode: boolean = false;

    switch (mode) {
        case 'dark':
            isDarkMode = true;
            break;
        case 'light':
            isDarkMode = false;
            break;
        case 'auto':
            isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            break;
    }
    

    // 根据模式设置页面主题和背景颜色
    if (isDarkMode) {
        document.body.setAttribute('arco-theme', 'dark');
        body.style.backgroundColor = "#2E2E2E";
    } else {
        document.body.removeAttribute('arco-theme');
        body.style.backgroundColor = "#FFFFFF";
    }
}

export{setThemeMode}
