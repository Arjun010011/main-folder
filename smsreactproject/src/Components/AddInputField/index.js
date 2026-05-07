import React from "react";
import { Grid, Button, TextField } from "@material-ui/core";
import NumberFormat from "react-number-format";
import "./styles.scss";

export default function AddInputField(props) {

  const [fieldValue, setFieldValue] = React.useState(props.type?props.type==='text'?'':0:0);

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
    showAddButton,
    showDeleteButton,
    disabled,
    onClickActionButton,
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
            label={label}
            fullWidth
            value={fieldValue}
            type={type?type:"number"}
            name={name ? name : "Add new FeeTypes"}
            onBlur={(e) => onBlurFieldValue(e, index)}
            autoComplete="off"
            helperText={fieldError !== "" && fieldError}
            error={error?error:fieldError === "" || !fieldError ? false : true}
            className="fee-term-date-filter"
            disabled={disabled}
            onChange={(e) => checkMax(e,max)}
          />
        {showDeleteButton && (
            <Button
              variant="contained"
              className={"delete-inp-button"}
              onClick={() => onClickActionButton("delete", index)}
            >
              <i
                className="fa fa-times close-input-field"
                aria-hidden="true"
              ></i>
            </Button>
        )}
        {showAddButton && (
            <Button
              variant="contained"
              className="add-inp-button"
              onClick={() => onClickActionButton("add", index)}
            >
              Add
            </Button>
        )}
    </>
  );
}