import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import { SetAcademicYear } from 'Includes/functions';

const useStyle = makeStyles(theme => ({
  select: {
    backgroundColor: "transparent",
    padding: "10px 20px",
    marginTop: 9,
    minWidth: 140
  },
}));


export default function SelectBox({ name, value, onChange, data }) {
  const classes = useStyle();
  return (<select name={name} value={value} onChange={onChange} className={classes.select}>
    <option value={0} >select</option>
    {data.map(({ id, name }) => {
      return <option key={id} value={id} className={classes.option}>{name}</option>
    })}
  </select>)
}

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

export function Dropdown({ id, label, name, customName = 'name', customId = 'id', error, value, disabled,
  required, style, fullWidth, helperText, onChange, data = [], className, hideSelect, size, showErrorMessage = true,
  labelBackGroundClassName, variant = 'outlined', selectClassName = '', menuListMaxHeight }) {
  const classes = useStyles();
  const [values, setValues] = React.useState({
    age: '',
    name: '',
  });
  const inputLabel = React.useRef(null);
  const [labelWidth, setLabelWidth] = React.useState(0);
  const [label_name, setName] = React.useState(customName);
  const [label_id, setId] = React.useState(customId);
  React.useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth);
  }, []);
  const onChangeYear = (e, index) => {
    if ((e.target.value !== 0 || (!required && !hideSelect))) {

      if (name === "year") {
        // SetAcademicYear(e.target.value);
      }

      onChange(e, index)
    }
  }

  return (
    <div className={className}>
      <FormControl required={required} size={size ? size : 'large'} error={error ? true : false} variant={variant} className={style ? style : classes.formControl} fullWidth={fullWidth} >
        <InputLabel ref={inputLabel} htmlFor="outlined-age-simple" className={labelBackGroundClassName}>
          {label}
        </InputLabel>
        <Select
          name={name}
          variant={variant}
          value={value}
          className={selectClassName}
          disabled={disabled}
          id={id}
          onChange={(e, index) => onChangeYear(e, index)}
          labelWidth={labelWidth}
          MenuProps={
            menuListMaxHeight
              ? { PaperProps: { style: { maxHeight: menuListMaxHeight } } }
              : undefined
          }
        >
          {!hideSelect && !required &&
            <MenuItem value={0}>
              <em>Select</em>
            </MenuItem>
          }
          {data.length === 0 && hideSelect &&
            <MenuItem value={0}>
              <em>No Data</em>
            </MenuItem>
          }
          {data.length !== 0 && data.map((data) => {
            if (!data.hide) {
              return <MenuItem key={data[label_id]} id={`${id}_${data[label_name]}`} value={data[label_id]}>{data[label_name]}</MenuItem>
            }
          })}
        </Select>
        {
          error && showErrorMessage &&
          <FormHelperText>{error}</FormHelperText>
        }
        {
          value === '' && !error &&
          <FormHelperText>{helperText}</FormHelperText>
        }
      </FormControl>
    </div >
  );
}
