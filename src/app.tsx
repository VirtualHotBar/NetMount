import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Button, Message, Grid, ConfigProvider, Spin } from '@arco-design/web-react';
import "@arco-themes/react-vhbs/css/arco.css";
//import "@arco-design/web-react/dist/css/arco.css";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import { Routers } from './type/routers';
import { IconClose, IconCloud, IconHome, IconList, IconMinus, IconSettings, IconStorage, IconSwap } from '@arco-design/web-react/icon';
import { windowsHide, windowsMini } from './controller/window';
import { hooks } from './services/hook';
import { getLocale } from './controller/language/language';
import { nmConfig } from './services/config';
import { getLangCode } from './controller/language/localized';

const { Item: MenuItem, SubMenu } = Menu;
const { Sider, Header, Content } = Layout;
const Row = Grid.Row;
const Col = Grid.Col;

const HomePage = React.lazy(() => import('./page/home/home').then(module => ({ default: module.Home_page })))
const StoragePage = React.lazy(() => import('./page/storage/storage').then(module => ({ default: module.Storage_page })))
const AddStoragePage = React.lazy(() => import('./page/storage/add').then(module => ({ default: module.AddStorage_page })))
const ExplorerPage = React.lazy(() => import('./page/storage/explorer').then(module => ({ default: module.Explorer_page })))
const MountPage = React.lazy(() => import('./page/mount/mount').then(module => ({ default: module.Mount_page })))
const AddMountPage = React.lazy(() => import('./page/mount/add'))
const TransmitPage = React.lazy(() => import('./page/transmit/transmit').then(module => ({ default: module.Transmit_page })))
const TaskPage = React.lazy(() => import('./page/task/task').then(module => ({ default: module.Task_page })))
const AddTaskPage = React.lazy(() => import('./page/task/add').then(module => ({ default: module.AddTask_page })))
const SettingPage = React.lazy(() => import('./page/setting/setting'))

const routeLoadingFallback = (
    <div style={{ width: '100%', textAlign: 'center', paddingTop: '2rem' }}>
        <Spin size={28} />
    </div>
)


//递归查询对应的路由
function searchRoute(
    path: string,
    routes: Routers[]
): Routers | null {
    for (const item of routes) {
        if (item.path === path) {
            return item;
        }
        if (item.children) {
            const found = searchRoute(path, item.children);
            if (found) {
                return found;  // 当在子路由中找到匹配项时，直接返回
            }
        }
    }
    return null;
}

//生成菜单
function mapMenuItem(routes: Routers[]): JSX.Element {
    return <>{
        routes.map((item) => {
            if (item.hide) {
                return <></>
            } else if (item.children && item.children.length > 0 && !item.hideChildren) {
                return (<SubMenu key={item.path} title={item.title} >{mapMenuItem(item.children)}</SubMenu>)
            } else {
                return (<MenuItem key={item.path} > {item.title}</MenuItem>)
            }
        })
    }</>

}

//生成页面
function mapRouters(routes: Routers[]): JSX.Element {
    return <>{
        routes.map((item) => { // 添加index作为map方法的第二个参数，用于生成唯一键
            if (item.children && item.children.length > 0) {
                return <React.Fragment key={`${item.path}-group`}> {/* 给包含子路由的Fragment添加一个唯一的key */}
                    {mapRouters(item.children)}
                    {item.component ? <Route key={item.path} path={item.path} element={item.component}></Route> : <></>}
                </React.Fragment>;
            } else {
                return <Route key={item.path} path={item.path} element={item.component}></Route>;
            }
        })
    }</>
}

function App() {
    //const [router, setRouter] = useState<Routers | null>();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation()
    const [localeStr, setLocaleStr] = useState<string>(getLangCode(nmConfig.settings.language!))
    const [selectedKeys, setSelectedKeys] = useState<string[]>(['/']);


    const routers: Array<Routers> = useMemo(() => [
        {
            title: <><IconHome />{t('home')}</>,
            path: '/',
            component: <HomePage />,
        },
        {
            title: <><IconCloud />{t('storage')}</>,
            path: '/storage',
            children: [
                {
                    title: t('manage'),
                    path: '/storage/manage',
                    component: <StoragePage />,
                    hideChildren: true,
                    children: [
                        {
                            title: t('add'),
                            path: '/storage/manage/add',
                            key: '/storage/manage',//因为父菜单隐藏了子菜单项，在此页面时设置父菜单key以选择父菜单项
                            component: <AddStoragePage />,
                        }
                    ]
                },
                {
                    title: t('explorer'),
                    path: '/storage/explorer',
                    component: <ExplorerPage />
                }
            ]
        }, {
            title: <><IconStorage />{t('mount')}</>,
            path: '/mount',
            component: <MountPage />,
            hideChildren: true,
            children: [
                {
                    title: t('add'),
                    path: '/mount/add',
                    key: '/mount',//因为父菜单隐藏了子菜单项，在此页面时设置父菜单key以选择父菜单项
                    component: <AddMountPage />,
                }
            ]
        },
        {
            title: <><IconSwap style={{ transform: 'rotate(90deg)' }} />{t('transmit')}</> /* +(rcloneInfo.stats.transferring? '(' + rcloneInfo.stats.transferring.length + ')': '') */,
            path: '/transmit',
            component: <TransmitPage />,
        },
        {
            title: <><IconList />{t('task')}</>,
            path: '/task',
            component: <TaskPage />,
            hideChildren: true,
            children: [
                {
                    title: t('add'),
                    path: '/task/add',
                    key: '/task',//因为父菜单隐藏了子菜单项，在此页面时设置父菜单key以选择父菜单项
                    component: <AddTaskPage />,
                }
            ]
        },
        {
            title: <><IconSettings />{t('setting')}</>,
            path: '/setting',
            component: <SettingPage />,
        }
    ], [t])

    useEffect(() => {
        hooks.setLocaleStr = setLocaleStr
    }, [])

    useEffect(() => {

        hooks.navigate = (path: string) => {
            if (path != location.pathname) {
                location.pathname.includes('add') && Message.warning(t('prompt_for_leaving_the_add_or_edit_page'))
                navigate(path)
            }
        }

        //setRouter(searchRoute(location.pathname, routers));
        const route = searchRoute(location.pathname, routers);
        if (route) {
            if (route.key) {
                setSelectedKeys([route.key]);
            } else {
                setSelectedKeys([route.path]);
            }
        }
    }, [location]);


    /* 
        <Layout style={{ height: '400px' }}>
        <Header>Header</Header>
        <Layout>
          <Sider>Sider</Sider>
          <Content>Content</Content>
        </Layout>
        <Footer>Footer</Footer>
      </Layout> */
    return (
        <ConfigProvider locale={getLocale(localeStr)}>
            <Layout style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--color-bg-1)'
            }}>
                <Header style={{ width: '100%', height: '2.4rem', backgroundColor: 'var(--color-bg-2)', borderBlockEnd: '1px solid var(--color-border-2)' }}>
                    <Row >
                        <Col flex={'auto'} data-tauri-drag-region style={{ height: '2.4rem', display: 'flex' }}>
                            <img src='/img/color.svg' style={{ width: '1.8rem', height: '1.8rem', marginTop: '0.3rem', marginLeft: '0.6rem' }} data-tauri-drag-region />
                            <span style={{ marginLeft: '0.3rem', fontSize: '1.2rem', marginTop: '0.3rem', color: 'var(--color-text-1)' }} data-tauri-drag-region>NetMount</span>
                        </Col>
                        <Col flex={'5rem'} style={{ textAlign: 'right' }}>
                            <Button onClick={windowsMini} icon={<IconMinus style={{ fontSize: '1.1rem', color: 'var(--color-text-2)' }} />} type='text' style={{ width: '2.5rem', paddingTop: '0.5rem' }} />
                            <Button onClick={windowsHide} icon={<IconClose style={{ fontSize: '1.1rem' }} />} type='text' status='danger' style={{ width: '2.5rem', paddingTop: '0.5rem' }} />
                        </Col>
                    </Row>
                </Header>

                <Layout style={{ maxHeight: 'calc(100% - 2.4rem)' }}>
                    <Sider style={{ width: '10rem' }} >
                        <Menu
                            defaultOpenKeys={['/storage']}
                            selectedKeys={selectedKeys}
                            style={{ height: '100%' }}
                            onClickMenuItem={(path) => {
                                hooks.navigate(path)
                            }}
                        >{mapMenuItem(routers)}</Menu>
                    </Sider>
                    <Content style={{ maxHeight: '100%', padding: '1.1rem' }}>
                        {/* <Breadcrumb style={{ margin: '16px 0' }}>{generateBreadcrumb(location.pathname, routers)}</Breadcrumb> */}
                        <Suspense fallback={routeLoadingFallback}>
                            <Routes>{mapRouters(routers)}</Routes>
                        </Suspense>
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    )
}

export { App }
