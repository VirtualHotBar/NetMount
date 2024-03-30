import { Button, Collapse, Form, Space } from '@arco-design/web-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { ParametersType } from '../../type/rclone/storage/defaults';
import { getProperties } from '../../utils/rclone/utils';
import { defaultMountConfig, defaultVfsConfig } from '../../controller/storage/mount/parameters/defaults';
import { InputItem_module } from '../other/inputItem';

const CollapseItem = Collapse.Item;

export default function AddMount_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();
    const [showAllOptions, setShowAllOptions] = useState(false)

    let parameters: ParametersType = {mountOpt: {}, vfsOpt: {}}

    const setMountParams = (key: string, value: any) => {
        parameters.mountOpt[key] = value;
    };

    const setVfsParams = (key: string, value: any) => {
        parameters.vfsOpt[key] = value;
    };

    return (
        <div>
            <Form>
                {
                    <div style={{ display: showAllOptions ? 'block' : 'none' }}>
                        {
                            getProperties(defaultMountConfig).map((item) => {
                                return (
                                    <InputItem_module key={item.key} data={item} setParams={setMountParams} />
                                )
                            })
                        }
                        {
                            getProperties(defaultVfsConfig).map((item) => {
                                return (
                                    <InputItem_module key={item.key} data={item} setParams={setVfsParams} />
                                )
                            })
                        }
                    </div>
                }

                {/* 按钮 */}
                <div style={{ width: '100%', textAlign: 'right' }}>
                    <Space>
                        {!showAllOptions && <Button onClick={() => { setShowAllOptions(!showAllOptions) }} type='text'>{t('show_all_options')}</Button>}
                        <Button onClick={() => { navigate('/mount') }} >{t('step_back')}</Button>
                        <Button onClick={() => {
                            console.log(parameters);

                        }} type='primary'>{t('mount')}</Button>
                    </Space>
                </div>
            </Form>
        </div>
    )
}
