import React from 'react'
import classNames from 'classnames'
import { Box, FormControl, FormHelperText, InputLabel } from '@material-ui/core';
import ReactPhoneInput from 'react-phone-input-2';

import './styles.scss'

function index(props) {
    const { id, className, label, value, name, onBlur, helperText, onChange, error, required, size = 'medium' } = props
    const updatedClassName = className.includes("margin") ? className : classNames('m-0', className)
    let phoneClassName=''
    if(size==='small'){
        phoneClassName='size-small-phone'
    }
    return (
        <FormControl
        size={size}
        variant='outlined'
        margin='normal'
        className={error ? classNames('error-border-mobile-number', updatedClassName) : updatedClassName}
        required={required}
        error={error && (error ? true : false)}
        id={id}
        >
            <InputLabel htmlFor='outlined-age-simple' className='background-white' shrink={true}>
                {label}
            </InputLabel>
            <ReactPhoneInput
                size={size}
                value={value}
                name={name}
                country='in'
                onChange={onChange}
                id={id}
                onBlur={onBlur}
                specialLabel=''
                inputProps={{
                    ...((size==='small') ? {
                        className:'size-small-phone',
                    } : {}),
                    label: { label },
                    autoFocus: false
                }}
                inputExtraProps={{
                    margin: 'normal',
                    autoComplete: 'phone',
                    name: 'custom-username',
                    backgroundColor: 'white'
                }}
            />
            {error &&
                <FormHelperText>{error}</FormHelperText>
            }
        </FormControl>

    )
}



export default index


// <Box className={className}>
// <Box className={classNames(error ? 'text-red label' : 'label')}
// >   {label}</Box>
// <ReactPhoneInput
//     value={value}
//     name={name}
//     fullWidth
//     country='in'
//     onChange={onChange}
//     onBlur={onBlur}
//     className='phone-number'
//     inputExtraProps={{
//         margin: 'normal',
//         autoComplete: 'phone',
//         name: 'custom-username',
//     }}
// />
// <div className={error ? 'helperText-red' : 'helperText'}>
//     {helperText}
// </div>
// </Box>
