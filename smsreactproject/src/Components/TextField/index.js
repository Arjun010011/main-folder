import React from 'react'
import classNames from 'classnames'
import { Box } from '@material-ui/core';

import './styles.scss'

function index(props) {
    const { label, value, name, helperText, onChange, onBlur, error, className, maxLength, required, disabled } = props
    return (
        <div>
            <Box className={classNames(error ? 'text-red label' : 'label')}
            >   {label}{required ? '*' : ''}</Box>
            <input placeholder=" "
                value={value}
                name={name}
                onChange={onChange}
                maxLength={maxLength}
                className={classNames(className, 'text-field', error ? 'border-red' : '')}
                onBlur={onBlur}
                disabled={disabled}
            />
            <div className={error ? 'helperText-red' : 'helperText'}>
                {helperText}
            </div>
        </div>
    )
}

export default index
