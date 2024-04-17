import React, { useEffect, useState } from 'react'
import { DevTips_module } from '../other/devTips'
import { Button, Card, Collapse, Divider, Form, Grid, Link, Select, Space, Typography } from '@arco-design/web-react'
import { Test } from '../../controller/test'
import { nmConfig, roConfig } from '../../services/config';
import { setThemeMode } from '../../controller/setting/setting';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { shell } from '@tauri-apps/api';
const CollapseItem = Collapse.Item;
const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;

export default function Setting_page() {
  const { t } = useTranslation()

  useEffect(() => {

  }, [])

  return (
    <div>
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        <Card title={t('setting')} style={{}} size='small'>
          <Form autoComplete='off'>
            <FormItem label={t('theme_mode')}>
              <Select
                defaultValue={nmConfig.settings.themeMode}
                onChange={(value) => {
                  nmConfig.settings.themeMode = value;
                  setThemeMode(value);
                }}
                style={{ width: '8rem' }}
              >
                {roConfig.options.setting.themeMode.select.map((item, index) => {
                  return (
                    <Select.Option key={index} value={item}>{t(`${item}_themeMode`)}</Select.Option>
                  )
                })}
              </Select>
            </FormItem>
          </Form>
        </Card>
        <Card title={t('about')} style={{}} size='small'>
          <Row >
            <Col flex={'auto'} >
              由独立开发者 VirtualHotBar 开发并发布
              <br />
              技术栈:Tauri,TypeScript,Vite,React,Arco Design,Rust
              <br />
              Copyright © 2024-Present VirtualHotBar
            </Col>
            <Col flex={'10rem'} style={{ textAlign: 'right' }}>
            <Link onClick={()=>{shell.open(roConfig.url.website)}}> NetMount官网 </Link>
            <br />

            </Col>
          </Row>

        </Card>
        <Card title={t('tools')} style={{}} size='small'>
          <Button onClick={Test}>Test</Button>
        </Card>
      </Space>



    </div>
  )
}
