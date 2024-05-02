import React, { useEffect, useReducer, useState } from 'react'
import { DevTips_module } from '../other/devTips'
import { Button, Card, Collapse, Divider, Form, Grid, Link, Message, Modal, Select, Space, Switch, Typography } from '@arco-design/web-react'
import { Test } from '../../controller/test'
import { nmConfig, roConfig, saveNmConfig } from '../../services/config';
import { getAutostartState, setAutostartState, setThemeMode } from '../../controller/setting/setting';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { shell } from '@tauri-apps/api';
import { rcloneInfo } from '../../services/rclone';
import { setLocalized } from '../../controller/language/localized';
const CollapseItem = Collapse.Item;
const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;

export default function Setting_page() {
  const { t } = useTranslation()
  const [autostart, setAutostart] = useState<boolean>()
  const [modal, contextHolder] = Modal.useModal();
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件

  const getAutostart = async () => {
    setAutostart(await getAutostartState());
  }

  const showLog = (log: string) => {
    modal.info!({

      title: t('log'),
      content: <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {log}
      </div>
    })

  }

  useEffect(() => {
    getAutostart()
  }, [])



  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        <Card title={t('setting')} style={{}} size='small'>
          <Form autoComplete='off'>
            <FormItem label={t('language')}>
              <Select
                defaultValue={nmConfig.settings.language}
                onChange={async (value) => {
                  nmConfig.settings.language = value
                  await setLocalized(nmConfig.settings.language!)
                }}
                style={{ width: '8rem' }}
              >
                {roConfig.options.setting.language.select.map((item, index) => {
                  return (
                    <Select.Option key={index} value={item.value}>{item.name}</Select.Option>
                  )
                })}
              </Select>
            </FormItem>
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
            <FormItem label={t('autostart')}>
              <Switch checked={autostart} onChange={async (value) => {
                await setAutostartState(value);
                setAutostart(value)
              }} />

            </FormItem>
            <FormItem label={t('start_hide')}>
              <Switch checked={nmConfig.settings.startHide} onChange={async (value) => {
                nmConfig.settings.startHide = value
                forceUpdate()
              }} /></FormItem>
              <div style={{width:'100%',textAlign:'right'}}><Button type='primary' onClick={async ()=>{
                await saveNmConfig()
                Message.success(t('saved'))
              }}>{t('save')}</Button></div>
          </Form>
        </Card>
        <Card title={t('about')} style={{}} size='small'>
          <Row >
            <Col flex={'auto'} >
              {t('about_text')}
              <br />
              {t('technology_stack')}:Tauri,TypeScript,Vite,React,Arco Design,Rust
              <br />
              Copyright © 2024-Present VirtualHotBar
            </Col>
            <Col flex={'10rem'} style={{ textAlign: 'right' }}>
              <Link onClick={() => { shell.open(roConfig.url.website) }}> NetMount </Link>
              <br />
              <Link onClick={() => { open(roConfig.url.website + 'page/license') }}> {t('licence')} </Link>
              <br />
            </Col>
          </Row>
        </Card>
        <Card title={t('components')} style={{}} size='small'>
          <Link onClick={() => { shell.open(roConfig.url.rclone) }}>Rclone</Link>(<Link onClick={() => {
            rcloneInfo.process.log && showLog(rcloneInfo.process.log)
          }}>{t('log')}</Link>): {rcloneInfo.version.version}
          <br />
        </Card>
        <Card title={t('tools')} style={{}} size='small'>
          <Button onClick={Test}>Test</Button>
        </Card>
      </Space>
    </div>
  )
}
