import React, { Component } from 'react'
import 'react-datasheet/lib/react-datasheet.css';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const useStyles = makeStyles(theme => ({
    root: {
      // display: 'flex',
      // flexWrap: 'wrap',
    },
    formControl: {
      // margin: theme.spacing(1),
      maxWidth: "320px",
      width: '100%',
      minWidth: "220px",
    },
    selectEmpty: {
      // marginTop: theme.spacing(2),
    },
  }));

export function BDUValidation({ label, name, error, value, disabled, required, style, fullWidth, helperText, onChange, data = [], className }) {
    const classes = useStyles();
    const inputLabel = React.useRef(null);
    const [labelWidth, setLabelWidth] = React.useState(0);
    React.useEffect(() => {
      setLabelWidth(inputLabel.current.offsetWidth);
    }, []);
    const onChangeYear = (e, index) => {
      if (name === "year") {
        // SetAcademicYear(e.target.value);
      }
  
      onChange(e, index)
    }
    return (<div className={className}>
        <FormControl required={required} error={error ? true : false} variant="outlined" className={style ? style : classes.formControl} fullWidth={fullWidth} >
          <InputLabel ref={inputLabel} htmlFor="outlined-age-simple">
            {label}
          </InputLabel>
          <Select
            name={name}
            variant="outlined"
            value={value}
            disabled={disabled}
            // onChange={(e, index) => onChangeYear(e, index)}
            labelWidth={labelWidth}
          >
            <MenuItem value={0}>
              <em>Select</em>
            </MenuItem>
  
            {data.map(({ id, validation_type }) => {
              return <MenuItem key={id} value={id}>{validation_type}</MenuItem>
            })}
          </Select>
          {
            error &&
            <FormHelperText>{error}</FormHelperText>
          }
          {
            value === '' && !error &&
            <FormHelperText>{helperText}</FormHelperText>
          }
        </FormControl>
      </div>
    )
}
