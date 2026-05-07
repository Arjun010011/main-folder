import React from "react";
import classNames from "classnames";
import { Box, TextField, Checkbox, Chip } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { CheckBoxOutlineBlank, CheckBox } from "@material-ui/icons";

const icon = <CheckBoxOutlineBlank fontSize="small" />;
const checkedIcon = <CheckBox fontSize="small" />;

function index(props) {
  const {
    id,
    data_list,
    selected_list,
    onChange,
    error,
    label,
    className,
    optionValue = "name",
    customId = "id",
    size = "medium",
    required = false,
    onClose,
    limitTags = 1,
    disabled = false,
    helperText,
    disabled_items = [],
    enableSelectAll = false,
  } = props;
  const ALL_KEY = "__all__";
  const totalCount = (data_list || []).length;
  const selectedCount = (selected_list || []).length;
  const isAllSelected = totalCount > 0 && selectedCount >= totalCount;
  const selectAllOption = enableSelectAll
    ? { [customId]: ALL_KEY, [optionValue]: isAllSelected ? "Deselect All" : "Select All" }
    : null;
  const options = enableSelectAll
    ? [selectAllOption, ...(data_list || [])]
    : (data_list || []);
  return (
    <Box className={className ? className : "width-300px"}>
      <Autocomplete
        disabled={disabled}
        size={size}
        limitTags={limitTags}
        multiple
        id={id}
        options={options}
        disableCloseOnSelect
        getOptionLabel={(option) => option?.[optionValue] || ''}
        getOptionSelected={(option, value) => {
          if (!option || !value) return false;
          return String(option?.[customId]) === String(value?.[customId]);
        }}
        onChange={(e, value) => {
          const picked = value || [];
          // Handle Select All synthetic option
          const hasAll = picked.some((v) => String(v?.[customId]) === ALL_KEY);
          const dataList = data_list || [];
          const lockedOptions = dataList.filter((d) => disabled_items.includes(d[customId]));

          if (enableSelectAll && hasAll) {
            if (isAllSelected) {
              // Deselect all (but preserve locked options)
              onChange([...lockedOptions]);
            } else {
              // Select all real options
              const allReal = dataList.filter((d) => !disabled_items.includes(d[customId]));
              onChange([...lockedOptions, ...allReal]);
            }
            return;
          }

          // Normal behavior: remove any synthetic option and preserve locked items
          const filtered = picked.filter((v) => String(v?.[customId]) !== ALL_KEY);
          const finalValue = [
            ...lockedOptions,
            ...filtered.filter((v) => !disabled_items.includes(v[customId])),
          ];
          onChange(finalValue);
        }}
        value={selected_list ? selected_list : []}
        onClose={onClose}
        required
        renderOption={(option, { selected }) => {
          // Render Select All line
          if (enableSelectAll && String(option?.[customId]) === ALL_KEY) {
            return (
              <React.Fragment>
                <Checkbox
                  id={`${id}_select_all`}
                  icon={icon}
                  checkedIcon={checkedIcon}
                  style={{ marginRight: 8 }}
                  checked={isAllSelected}
                />
                {option[optionValue]}
              </React.Fragment>
            );
          }
          const isDisabled = disabled_items.includes(option[customId]);
          return (
            <React.Fragment>
              <Checkbox
                id={`${id}_${option.name}`}
                icon={icon}
                checkedIcon={checkedIcon}
                style={{ marginRight: 8 }}
                checked={selected}
                disabled={isDisabled}
              />
              {option[optionValue]}
            </React.Fragment>
          );
        }}
        style={{ maxWidth: 500 }}
        renderInput={(params) => (
          <TextField
            className="width-300px"
            {...params}
            variant="outlined"
            label={label}
            error={error && error}
            helperText={helperText ? helperText : error}
            required={required}
          />
        )}
      />
    </Box>
  );
}

export default index;
