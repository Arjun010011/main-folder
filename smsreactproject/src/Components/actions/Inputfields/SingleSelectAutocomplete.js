/* eslint-disable no-use-before-define */
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';

export default function ComboBox({ label,value, changeFunction,data , name }) {

    return (
        <Autocomplete
            onChange={(event, value) => changeFunction(value,name)}
            defaultValue={value}
            id="combo-box-demo"
            options={data}
            getOptionLabel={option => option.name}
            // style={{ width: 300 }}
            renderInput={params => (
                <TextField {...params} label={label} variant="outlined" fullWidth />
            )}
        />
    );
}

