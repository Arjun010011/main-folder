import React, { useState, useEffect } from "react";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function DropDownWithSearch({
  id,
  size,
  optionValue,
  options,
  value,
  name,
  label,
  disabled,
  required,
  fullWidth,
  helperText,
  className = "set-question-box",
  onChange,
  onOpen,
  error,
  loadingValue,
  hideClearIcon,
  autoCompleteClassName = "",
  variant = "outlined",
  autoFocus = false
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loadingValue) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  });

  return (
    <div className="">
      <Autocomplete
        autoFocus={autoFocus}
        size={size}
        autoComplete="off"
        className={autoCompleteClassName}
        options={options}
        value={value ? value : null}
        getOptionLabel={(option) => option[optionValue ? optionValue : "name"]}
        getOptionSelected={(option, value) => {
          // If both have an id property, compare by id
          if (option?.id && value?.id) {
            return String(option.id) === String(value.id);
          }
          // If both have start_date and end_date, compare by those
          if (option?.start_date && value?.start_date && option?.end_date && value?.end_date) {
            return option.start_date === value.start_date && option.end_date === value.end_date;
          }
          // Fallback to reference equality
          return option === value;
        }}
        onChange={onChange}
        onOpen={onOpen}
        id={id}
        name={name}
        loading={loading}
        disabled={disabled}
        disableClearable={hideClearIcon ? true : false}
        onInputChange={async (event, value) => {
          if (!value) return;
          setLoading(true);
          await sleep(1000);
          setLoading(false);
        }}
        renderInput={(params) => {
          params.inputProps.autoComplete = "off";
          return (
            <TextField
              {...params}
              autoFocus={autoFocus}
              autoComplete="off"
              size={size}
              label={label}
              className={className}
              required={required}
              fullWidth={fullWidth}
              variant={variant}
              helperText={error ? error : helperText}
              error={error}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
            />
          );
        }}
      />
    </div>
  );
}
