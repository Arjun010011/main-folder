import React from "react";
import { Grid, Button, TextField } from "@material-ui/core";
import NumberFormat from "react-number-format";

export default function PreviewTextField(props) {

  const [fieldValue, setFieldValue] = React.useState('');

  const checkMax = (e, max) =>{
    if( !max || max >= e.target.value ){
      setFieldValue(e.target.value)
    }

  }

  React.useEffect(() => {
    setFieldValue(props.fieldValue)
  }, [props.fieldValue]);

  const {
    fieldError,
    index,
    disabled,
    onBlurFieldValue,
    name,
    label,
    max,
    error,
    type
  } = props;
  return (
    <>
      <TextField
        id="outlined-name"
        variant="outlined"
        size="small"
        label={label}
        value={fieldValue}
        type={"number"}
        name={name ? name : "Add new FeeTypes"}
        onBlur={(e) => onBlurFieldValue(e, index)}
        autoComplete="off"
        helperText={fieldError !== "" && fieldError}
        error={error ? error : fieldError === "" || !fieldError ? false : true}
        className="fee-term-date-filter"
        disabled={disabled}
        onChange={(e) => checkMax(e, max)}
        inputProps={{ max: 8, style: { textAlign: 'right' } }}
      />
    </>
  );
}