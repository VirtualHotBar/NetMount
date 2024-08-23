import React, { useEffect, useReducer, useState } from 'react'
import { DevTips_module } from '../other/devTips'
import { Button, Card, Collapse, Divider, Form, Grid, Input, Link, Message, Modal, Select, Space, Switch, Typography } from '@arco-design/web-react'
import { Test } from '../../controller/test'
import { nmConfig, osInfo, roConfig, saveNmConfig } from '../../services/config';
import { getAutostartState, setAutostartState, setThemeMode } from '../../controller/setting/setting';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import * as shell from '@tauri-apps/plugin-shell';
import { rcloneInfo } from '../../services/rclone';
import { setLocalized } from '../../controller/language/localized';
import { openUrlInBrowser, set_devtools_state } from '../../utils/utils';
import { showLog } from '../other/modal';
import { alistInfo } from '../../services/alist';
const CollapseItem = Collapse.Item;
const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;

export default function Setting_page() {
  const { t } = useTranslation()
  const [autostart, setAutostart] = useState<boolean>()
  const [modal, contextHolder] = Modal.useModal();
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const [version, setVersion] = useState<string>()

  const getInfo = async () => {
    setAutostart(await getAutostartState());
    setVersion(await getVersion())
  }



  useEffect(() => {
    getInfo()
  }, [])



  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        <Card title={t('setting')} style={{}} size='small'>
          <Form autoComplete='off' style={{ paddingRight: '0.8rem' }}>
            <FormItem label={t('language')}>
              <Select
                defaultValue={nmConfig.settings.language}
                onChange={async (value) => {
                  nmConfig.settings.language = value
                  await saveNmConfig()
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
              <Switch checked={autostart} /* disabled={osInfo.osType==='Darwin'} */ onChange={async (value) => {
                await setAutostartState(value);
                setAutostart(value)
              }} />

            </FormItem>
            <FormItem label={t('start_hide')}>
              <Switch checked={nmConfig.settings.startHide} onChange={async (value) => {
                nmConfig.settings.startHide = value
                forceUpdate()
              }} />
            </FormItem>
            <FormItem label={t('cache_path')}>
              <Input value={nmConfig.settings.path.cacheDir} onChange={(value) => {
                nmConfig.settings.path.cacheDir = value
                forceUpdate()
              }
              } onClick={
                async () => {

                  
                }
              }/>
            </FormItem>

            <div style={{ width: '100%', textAlign: 'right' }}><Button type='primary' onClick={async () => {
              await saveNmConfig()
              Message.success(t('saved'))
            }}>{t('save')}</Button></div>
          </Form>


        </Card>
        <Card title={t('components')} style={{}} size='small'>
          <Link onClick={() => { shell.open(roConfig.url.rclone) }}>Rclone</Link>(<Link onClick={() => {
            rcloneInfo.process.log && showLog(modal, rcloneInfo.process.log)
          }}>{t('log')}</Link>): {rcloneInfo.version.version}
          <br />
          <Link onClick={() => { shell.open(roConfig.url.alist) }}>Alist</Link>(<Link onClick={() => {
            alistInfo.process.log && showLog(modal, alistInfo.process.log)
          }}>{t('log')}</Link>): {alistInfo.version.version}
          <br />
        </Card>
        <Card title={t('about')} style={{}} size='small'>
          <Row >
            <Col flex={'auto'} >
              {t('version')}: v{version}
              <br />
              {t('about_text')}
              <br />
              {/* {t('technology_stack')}:Tauri,TypeScript,Vite,React,Arco Design,Rust
              <br /> */}
              Copyright © 2024-Present
              <Link onClick={() => { openUrlInBrowser(roConfig.url.vhbBlog) }}>VirtualHotBar </Link>
            </Col>
            <Col flex={'10rem'} style={{ textAlign: 'right' }}>
              <Link onClick={() => { openUrlInBrowser(roConfig.url.website) }}> NetMount </Link>
              <br />
              <Link onClick={() => { openUrlInBrowser(roConfig.url.docs) }}> {t('docs')} </Link>
              <br />
              <Link onClick={() => { open(roConfig.url.docs + '/license') }}> {t('licence')} </Link>
              <br />
            </Col>
          </Row>
        </Card>
        <Card title={t('tools')} style={{}} size='small'>
          <Space>
            <Button onClick={async () => { await set_devtools_state(true) }}>{t('devtools')}</Button>
            <Button onClick={Test}>Test</Button>
          </Space>

        </Card>
      </Space>
    </div>
  )
}
