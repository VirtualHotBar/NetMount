import React, { useEffect, useState } from 'react'
import { Layout, Menu, Breadcrumb, Button, Message, Grid } from '@arco-design/web-react';
import "@arco-design/web-react/dist/css/arco.css";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import { Test } from './controller/test';
import { Routers } from './type/routers';
import { Home_page } from './page/home/home';
import { Storage_page } from './page/storage/storage';
import { AddStorage_page } from './page/storage/add';
import { Explorer_page } from './page/storage/explorer';
import { Mount_page } from './page/mount/mount';
import { Transmit_page } from './page/transmit/transmit';
import { Task_page } from './page/task/task';
import Setting_page from './page/setting/setting';
import AddMount_page from './page/mount/add';
import { IconClose, IconMinus } from '@arco-design/web-react/icon';
import { windowsHide, windowsMini } from './controller/window';
import { rcloneInfo } from './services/rclone';
import { AddTask_page } from './page/task/add';

const { Item: MenuItem, SubMenu } = Menu;
const { Sider, Header, Content, Footer } = Layout;
const Row = Grid.Row;
const Col = Grid.Col;

//递归查询对应的路由
function searchRoute(
    path: string,
    routes: Routers[]
): Routers | null {
    for (let item of routes) {
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

//生成面包屑
function generateBreadcrumb(pathname: string, routes: Routers[]): JSX.Element[] {
    const pathSnippets = pathname.split('/').filter(i => i);
    const breadcrumbItems: JSX.Element[] = [];

    if (pathSnippets.length == 1) {
        return [];
    }
    // 创建面包屑项（根据是否有子菜单和是否隐藏子菜单决定是否为链接）
    function createBreadcrumbItem(route: Routers): JSX.Element {
        if (route.children && route.children.length > 0 && !route.hideChildren) {
            return <>{route.title}</>;
        } else {
            return <Link to={route.path}>{route.title}</Link>;
        }
    }

    pathSnippets.reduce((prevPath, pathSnippet) => {
        const currentPath = `${prevPath}/${pathSnippet}`;
        const route = searchRoute(currentPath, routes);

        let breadcrumbItem: JSX.Element;

        if (route) {
            breadcrumbItem = (
                <Breadcrumb.Item key={currentPath}>
                    {createBreadcrumbItem(route)}
                </Breadcrumb.Item>
            );
        } else {
            breadcrumbItem = (
                <Breadcrumb.Item key={currentPath}>
                    {pathSnippet}
                </Breadcrumb.Item>
            );
        }
        breadcrumbItems.push(breadcrumbItem);
        return currentPath;
    }, '');

    return breadcrumbItems;
}


function App() {
    //const [router, setRouter] = useState<Routers | null>();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation()

    const [selectedKeys, setSelectedKeys] = useState<string[]>(['/']);


    const routers: Array<Routers> = [
        {
            title: t('home'),
            path: '/',
            component: <Home_page />,
        },
        {
            title: t('storage'),
            path: '/storage',
            children: [
                {
                    title: t('manage'),
                    path: '/storage/manage',
                    component: <Storage_page />,
                    hideChildren: true,
                    children: [
                        {
                            title: t('add'),
                            path: '/storage/manage/add',
                            key: '/storage/manage',//因为父菜单隐藏了子菜单项，在此页面时设置父菜单key以选择父菜单项
                            component: <AddStorage_page />,
                        }
                    ]
                },
                {
                    title: t('explorer'),
                    path: '/storage/explorer',
                    component: <Explorer_page />
                }
            ]
        }, {
            title: t('mount'),
            path: '/mount',
            component: <Mount_page />,
            hideChildren: true,
            children: [
                {
                    title: t('add'),
                    path: '/mount/add',
                    key: '/mount',//因为父菜单隐藏了子菜单项，在此页面时设置父菜单key以选择父菜单项
                    component: <AddMount_page />,
                }
            ]
        },
        {
            title: t('transmit') /* +(rcloneInfo.stats.transferring? '(' + rcloneInfo.stats.transferring.length + ')': '') */,
            path: '/transmit',
            component: <Transmit_page />,
        },
        {
            title: t('task'),
            path: '/task',
            component: <Task_page />,
            hideChildren: true,
            children: [
                {
                    title: t('add'),
                    path: '/task/add',
                    key: '/task',//因为父菜单隐藏了子菜单项，在此页面时设置父菜单key以选择父菜单项
                    component: <AddTask_page />,
                }
            ]
        },
        {
            title: t('setting'),
            path: '/setting',
            component: <Setting_page />,
        }
    ]


    useEffect(() => {
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

        <Layout style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--color-bg-1)'
        }}>
            <Header style={{ width: '100%', height: '2.4rem', backgroundColor: 'var(--color-bg-2)', borderBlockEnd: '1px solid var(--color-border-2)' }}>
                <Row >
                    <Col flex={'auto'} data-tauri-drag-region style={{ height: '2.4rem', display: 'flex' }}>
                        <img src="../src-tauri/icons/128x128.png" style={{ width: '2.2rem', height: '2.2rem', marginTop: '0.1rem', marginLeft: '0.3rem' }} data-tauri-drag-region />
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
                            if (path != location.pathname) {
                                location.pathname.includes('add')&&Message.warning(t('prompt_for_leaving_the_add_or_edit_page'))
                                navigate(path)
                            }
                        }}
                    >{mapMenuItem(routers)}</Menu>
                </Sider>
                <Content style={{ maxHeight: '100%', padding: '1.1rem' }}>
                    {/* <Breadcrumb style={{ margin: '16px 0' }}>{generateBreadcrumb(location.pathname, routers)}</Breadcrumb> */}
                    <Routes>{mapRouters(routers)}</Routes>
                </Content>
            </Layout>
        </Layout>


    )
}

export { App }
