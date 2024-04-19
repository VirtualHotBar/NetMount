// i18n.js 文件
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 引入语言文件
import cn from '../controller/language/zh-cn.json';

// 初始化资源文件，即各种语言的json文件
const resources = {
  cn: {
    translation: cn
  }
};

i18n
  // 连接react-i18next与i18next的插件配置
  .use(initReactI18next) 
  .init({
    resources,
/*lng: "cn", // 初始语言 */
    keySeparator: false, // 是否允许keys使用点分隔符
    interpolation: {
      escapeValue: false // 转义字符
    }
  });

export default i18n;
