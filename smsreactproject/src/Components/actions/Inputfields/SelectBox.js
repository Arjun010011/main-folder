import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

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
    minWidth: "220px",
  },
  selectEmpty: {
    // marginTop: theme.spacing(2),
  },
}));

export function Dropdown1({ label, name, error, value, onChange, data = [] }) {
  const classes = useStyles();
  const [values, setValues] = React.useState({
    age: '',
    name: '',
  });
  const inputLabel = React.useRef(null);
  const [labelWidth, setLabelWidth] = React.useState(0);
  React.useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth);
  }, []);
  return (
    <div>
      <FormControl error={error ? true : false} variant="outlined" className={classes.formControl} fullWidth={true} >
        <InputLabel ref={inputLabel} htmlFor="outlined-age-simple">
          {label}
        </InputLabel>
        <Select
          name={name}
          variant="outlined"
          value={value}
          onChange={onChange}
          labelWidth={labelWidth}
        >
          <MenuItem value={0}>
            <em>Select</em>
          </MenuItem>

          {data.map(({ id, name }) => {
            return <MenuItem key={id} value={id}>{name}</MenuItem>
          })}
        </Select>
        {
          error &&
          <FormHelperText>{error}</FormHelperText>
        }
      </FormControl>
    </div>
  );
}
