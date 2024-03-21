import React, { useEffect, useState } from 'react'
import { Layout, Menu, Breadcrumb, Button, Message } from '@arco-design/web-react';
import "@arco-design/web-react/dist/css/arco.css";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { invoke } from '@tauri-apps/api';

import { Test } from './controller/test';
import { Routers } from './type/routers';

const { Item: MenuItem, SubMenu } = Menu;
const { Sider, Header, Content } = Layout;

const routers: Array<Routers> = [
    {
        title: '首页',
        path: '/',
        component: <>home</>,


    },
    {
        title: '存储',
        path: '/storage',
        component: <>storage</>,
        children:
            [
                {
                    title: '测试',
                    path: '/storage/test',
                    component: <>test</>,

                }
            ]
    },
    {
        title: '设置',
        path: '/setting',
        component: <>settings</>,
    }
]


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
            if (item.children && item.children.length > 0) {
                return (<SubMenu key={item.path} title={item.title}>   {mapMenuItem(item.children)}</SubMenu>)
            } else {
                return (<MenuItem key={item.path}> {item.title}</MenuItem>)
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
    // 创建面包屑项（根据是否有子菜单决定是否为链接）
    function createBreadcrumbItem(route: Routers): JSX.Element {
        if (route.children && route.children.length > 0) {
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
    const [selectedKeys, setSelectedKeys] = useState<string[]>(['/']);

    useEffect(() => {
        //setRouter(searchRoute(location.pathname, routers));
        const route = searchRoute(location.pathname, routers);
        if (route) {
            setSelectedKeys([location.pathname]);
        }
    }, [location]);

    return (
        <Layout className=' w-full h-full'>
            <Sider >
                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                    <span className=' font-bold' style={{ fontSize: '1.5rem' }}>
                        NetMount
                    </span>
                </div>
                <Menu
                    defaultOpenKeys={[]} selectedKeys={selectedKeys} style={{ width: '100%' }}
                    onClickMenuItem={(path) => {
                        if (path != location.pathname) {
                            navigate(path)
                        }
                    }}
                >{mapMenuItem(routers)}</Menu>
            </Sider>
            <Layout>
                {/* <Header style={{ paddingLeft: 20 }}>Header</Header> */}
                <Layout style={{ padding: '0 24px' }}>
                    <Breadcrumb style={{ margin: '16px 0' }}>{generateBreadcrumb(location.pathname, routers)}
                    </Breadcrumb>
                    <Content style={{ padding: '1.4rem' }}>
                        <Routes>{mapRouters(routers)}</Routes>
                    </Content>
                    {/* <Footer>Footer</Footer> */}
                </Layout>
            </Layout>
        </Layout>
    )
}

export { App }
