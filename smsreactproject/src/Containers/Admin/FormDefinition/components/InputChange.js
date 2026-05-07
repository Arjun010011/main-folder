import React from 'react'
import { TextField } from '@material-ui/core';

export function InputChange({ value, name, index, field, onChange, disabled }) {

    const [values, setValues] = React.useState(value)


    const handleChangeText = (e) => {
        setValues(e.target.value)
    }

    const updateParent = (e) => {
        onChange(e, field, index)
    }

    React.useEffect(() => {
        setValues(value)
    }, []);

    return (
        <TextField
            id="standard-basic"
            value={values}
            name={name}
            onChange={(e) => handleChangeText(e)}
            onBlur={(e) => updateParent(e)}
            inputProps={{ maxLength: 250 }}
            disabled={disabled}
        />
    )
}