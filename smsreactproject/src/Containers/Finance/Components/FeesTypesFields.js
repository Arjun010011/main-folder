import React, { Component } from "react";
import classNames from "classnames";
import {
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  Tooltip,
} from "@material-ui/core";
import _ from "lodash";

import ControlPointOutlinedIcon from "@material-ui/icons/ControlPointOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { Dropdown } from "Components/DropDown";
import FeePlanAddStoreItems from "Containers/Finance/Components/FeePlanAddStoreItems";
import EditIcon from "@material-ui/icons/Edit";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { CUSTOM_CODE, TRANSPORT_CODE } from "Constants";
import { NumberFormatCustom } from "Includes/functions";
import { validateAmount } from "Includes/validations";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";

class FeesTypeFields extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newField: [],
      fieldValue: [],
      valueExisting: false,
      drop_down_list: {},
      isOpenStore: false,
      isEdit: false,
      storeIndex: "",
      selected_details: [],
    };
  }

  componentDidMount() {
    this.setDefaultValues();
  }

  setDefaultValues = () => {
    let { fieldDetails, fieldDefaultValue } = this.props;
    let { fieldValue, drop_down_list } = this.state;
    let data = {};
    let field_name = "";
    if (fieldDefaultValue.length > 0) {
      fieldDefaultValue.map((defaultValue) => {
        let temp = {};
        fieldDetails.map((fields, index) => {
          temp[fields.name] = defaultValue[fields.name]
            ? defaultValue[fields.name]
            : fields.default;
          temp[fields.name + "_error"] = defaultValue[fields.name + "_error"]
            ? defaultValue[fields.name + "_error"]
            : "";
          temp[fields.name + "_required"] = fields.required;
          temp[fields.name + "_allow_duplicates"] =
            "allowDuplicates" in fields ? fields.allowDuplicates : false;
        });
        temp["exist"] = false;
        temp["amount_disable"] = false;
        // Preserve _existing_id for edit-in-place
        if (defaultValue._existing_id) {
          temp["_existing_id"] = defaultValue._existing_id;
        }
        fieldValue.push(temp);
      });
    } else {
      fieldDetails.map((fields, index) => {
        data[fields.name] = fields.default;
        data[fields.name + "_required"] = fields.required;
        data[fields.name + "_error"] = "";
        data[fields.name + "_allow_duplicates"] =
          "allowDuplicates" in fields ? fields.allowDuplicates : false;
        if (fields.type === "drop_down" && !drop_down_list[fields.name]) {
          field_name = fields.name;
          drop_down_list = { field_name: {} };
          drop_down_list[field_name] = { 0: fields.list };
        }
      });
      data["exist"] = false;
      data["amount_disable"] = false;
      fieldValue.push(data);
    }
    this.setState({ ...fieldValue, fieldDetails, drop_down_list });
  };

  handleSearchChange = (e, field, index) => {
    let name = field.name;
    let value = e;
    if (field.type !== "dropDownWithSearch") {
      value = e.target.value;
    }
    let fieldValue = _.cloneDeep(this.state.fieldValue);
    fieldValue[index][name] = value;
    fieldValue[index]["exist"] = false;

    if (fieldValue[index][name] != "") {
      fieldValue[index][name + "_error"] = "";
    }

    if (fieldValue[index].fee_type.codename === TRANSPORT_CODE) {
      fieldValue[index].amount_disable = true;
      fieldValue[index].amount = "";
      fieldValue[index].is_mandatory = false;
    } else if (field.name === "fee_type") {
      fieldValue[index].amount_disable = false;
      fieldValue[index].is_mandatory =
        fieldValue[index].fee_type.codename === CUSTOM_CODE ? false : true;
      fieldValue[index].amount = "";
      field.list.map((data) => {
        if (
          data["id"] === fieldValue[index]["fee_type"].id &&
          data["codename"] === "store"
        ) {
          fieldValue[index].amount_disable = "store";
          fieldValue[index].is_mandatory = false;
          this.setState({
            storeIndex: index,
            fieldValue,
            isOpenStore: true,
          });
        }
      });
    }
    // else {
    //     fieldValue[index].amount_disable = false
    // }
    if (name === "amount") {
      const amountError = validateAmount(value);
      if (amountError["errorFound"]) {
        fieldValue[index][name + "_error"] = amountError["errorText"];
      }
    }
    this.setState({ fieldValue }, () => {
      if (field.type === "dropDownWithSearch" || field.type === "drop_down") {
        this.changeInParent(e, field, index);
      } else if (field.type === "radio") {
        this.props.updateParent(fieldValue);
      }
    });
  };

  changeInParent = (e, field, index) => {
    let value = e;
    if (field.type !== "dropDownWithSearch") {
      value = e.target.value;
    }
    let name = field.name;
    let { fieldValue } = this.state;
    if (fieldValue.fee_type != 0) {
      this.validateDuplicateField();
      if (field.type === "amount") {
        value = e.target.value;
        value = value.replace("₹", "").split(",").join("").trim();
      }
      if (field.regex && !field.regex.value.test(value) && value.length != 0) {
        fieldValue[index][name + "_error"] = field.regex.errorText;
      } else {
        if (value.length != 0) {
          fieldValue[index]["amount_error"] = "";
        }
      }
      this.setState(
        {
          fieldValue,
        },
        () => {
          let temp = [];
          fieldValue.forEach((item, index) => {
            let key = {};
            Object.keys(item).forEach((data) => {
              if (
                !data.includes("required") &&
                !data.includes("exist") &&
                !data.includes("duplicates") &&
                !data.includes("disable")
              ) {
                key[data] = item[data];
              }
            });
            // Preserve _existing_id for edit-in-place
            if (item._existing_id) {
              key._existing_id = item._existing_id;
            }
            if (temp.fee_type != 0) {
              temp.push(key);
            }
          });
          this.props.updateParent(temp);
        }
      );
    }
  };

  updateAvailableList = () => {
    let { fieldValue, fieldDetails, drop_down_list } = this.state;
    let list = {};
    let selected = {};
    fieldDetails.map((fieldData) => {
      if (fieldData.type === "drop_down" && !fieldData.allowDuplicates) {
        fieldValue.map((fieldValueData, fIndex) => {
          if (drop_down_list[fieldData.name]) {
            Object.keys(drop_down_list[fieldData.name]).map((data) => {
              drop_down_list[fieldData.name][data].map((listOption, index) => {
                if (
                  data !== fIndex &&
                  listOption["id"] === fieldValueData[fieldData["name"]]
                ) {
                  drop_down_list[fieldData.name][data][index]["hide"] = true;
                }
              });
            });
          }
          // if (!selected[fieldData.name]) {
          //     selected[fieldData.name] = {}
          // }
          // selected[fieldData.name][fIndex] = ''
          // selected[fieldData.name][fIndex] = fieldData.name
        });
      }
    });
    // fieldValue.map((valueData) => {
    //     if (fieldData.type === "drop_down" && !fieldData.allowDuplicates) {
    //         drop_down_list[].list.map((optionData, index) => {
    //             optionData['hide'] = selected[fieldData['name']][index] ? true : false
    //         })
    //     }
    // })
    this.setState({
      fieldDetails,
      drop_down_list,
    });
  };

  addNew = () => {
    const { fieldValue } = this.state;
    let emptyTest = true;
    let duplicateTest = true;
    emptyTest = this.validateEmptyField(fieldValue);
    if (!emptyTest) {
      return false;
    }
    duplicateTest = this.validateDuplicateField();
    if (!duplicateTest) {
      return false;
    }
    if (emptyTest && duplicateTest) {
      let newData = {};
      fieldValue.map((data) =>
        Object.keys(data).map((key) => {
          if (key.includes("required")) {
            newData[key] = data[key];
          } else if (key.includes("duplicates")) {
            newData[key] = data[key];
          } else if (key === "student_type") {
            newData[key] = "Both";
          } else if (key === "is_mandatory") {
            newData[key] = "1";
          } else if (key === "amount_disable") {
            newData[key] = false;
          } else {
            newData[key] = "";
          }
        })
      );
      this.setState({ fieldValue: fieldValue.concat(newData) });
      // this.updateAvailableList()
    }
  };

  validateEmptyField = (fieldValue) => {
    let test = true;
    fieldValue.forEach((item, index) => {
      Object.keys(item).forEach((data) => {
        if (
          !data.includes("error") &&
          !data.includes("required") &&
          !data.includes("duplicates") &&
          !data.includes("disable")
        ) {
          if (item[data].toString().trim() === "" && item[`${data}_required`]) {
            if (item[`${data}_disable`] !== true) {
              item[`${data}_error`] = "This field is Mandatory";
              test = false;
            }
          }
        }
      });
    });
    this.setState({
      fieldValue,
    });
    return test;
  };

  validateDuplicateField = (action) => {
    let { fieldValue } = this.state;
    const { fieldDetails } = this.props;

    let test = true;
    let tempFieldMap = {};
    let { duplicateCombinations } = this.props;
    let tempDupliateCombFinder = {};
    let findBothDuplicate = {};
    let findResDayDuplicate = {};
    fieldValue.forEach((item, index) => {
      Object.keys(item).forEach((data) => {
        if (
          !data.includes("error") &&
          !data.includes("required") &&
          !data.includes("exist") &&
          !data.includes("duplicates") &&
          !data.includes("disable")
        ) {
          let allow_duplicates = item[`${data}_allow_duplicates`];
          let value = item[data]?.["id"]
            ? item[data]["id"].toString()
            : item[data].toString().trim().toLowerCase();
          if (!tempFieldMap.hasOwnProperty(data)) {
            tempFieldMap[data] = [];
          }
          if (
            tempFieldMap[data].includes(value) &&
            value !== "" &&
            allow_duplicates !== true &&
            data !== "amount"
          ) {
            item[`${data}_error`] = "same data found";
            test = false;
          } else {
            if (data !== "amount" || action === "delete") {
              item[`${data}_error`] = "";
              tempFieldMap[data].push(value);
              test = true;
            }
          }
          if (item[data] !== "") {
            item["exist"] = true;
          }
        }
      });

      if (duplicateCombinations && duplicateCombinations.length > 0) {
        duplicateCombinations.map((data) => {
          let tempKey = "";
          let isBothExist = false;
          data["names"].map((name) => {
            tempKey += item[name]["id"];
            if (item[name] in findBothDuplicate) {
              data["names"].map((columnkey) => {
                item[`${columnkey}_error`] = data["errorMessage"]
                  ? data["errorMessage"]
                  : "Duplicate Combination found";
                fieldValue[findBothDuplicate[item[name]]][
                  `${columnkey}_error`
                ] = data["errorMessage"]
                  ? data["errorMessage"]
                  : "Duplicate Combination found";
              });
              isBothExist = true;
            } else if ("student_type" === name && item[name] === "Both") {
              if (item["fee_type"] in findResDayDuplicate) {
                data["names"].map((columnkey) => {
                  item[`${columnkey}_error`] = data["errorMessage"]
                    ? data["errorMessage"]
                    : "Duplicate Combination found";
                  fieldValue[findResDayDuplicate[item["fee_type"]]][
                    `${columnkey}_error`
                  ] = data["errorMessage"]
                    ? data["errorMessage"]
                    : "Duplicate Combination found";
                });
                isBothExist = true;
              } else {
                findBothDuplicate[item["fee_type"]] = index;
              }
            } else if (
              "student_type" === name &&
              (item[name] !== "Both" || !item[name])
            ) {
              findResDayDuplicate[item["fee_type"]] = index;
            }
          });
          if (tempKey in tempDupliateCombFinder) {
            data["names"].map((columnkey) => {
              item[`${columnkey}_error`] = data["errorMessage"]
                ? data["errorMessage"]
                : "Duplicate Combination found";
              fieldValue[tempDupliateCombFinder[tempKey]][
                `${columnkey}_error`
              ] = data["errorMessage"]
                ? data["errorMessage"]
                : "Duplicate Combination found";
            });
            test = false;
          } else if (!isBothExist) {
            tempDupliateCombFinder[tempKey] = index;
            data["names"].map((columnkey) => {
              item[`${columnkey}_error`] = "";
            });
          }
        });
      }
    });
    this.setState({
      fieldValue,
    });
    return test;
  };

  validateFields = () => {
    let test = true;
    const { fieldValue } = this.state;
    let field = [];
    let temp = {};
    let duplicateTest = true;
    let emptyTest = true;
    // duplicateTest = this.validateDuplicateField(fieldValue)
    emptyTest = this.validateEmptyField(fieldValue);
    if (emptyTest && duplicateTest) {
      fieldValue.map((data, index) => {
        Object.keys(data).map((tempData) => {
          if (
            tempData.includes("error") &&
            tempData != "amount" &&
            data[`${tempData}_disable`] !== true
          ) {
            if (data[tempData] !== "") {
              test = false;
            }
          } else if (
            data[tempData] === "store" &&
            !tempData.includes("error") &&
            !tempData.includes("required") &&
            !tempData.includes("exist")
          ) {
            if (
              data["exist"] === true &&
              (!data["store_list"] ||
                (data["store_list"] && data["store_list"].length <= 0))
            ) {
              data[tempData + "_error"] = "This field is Mandatory";
              test = false;
            } else {
              if (data[tempData] !== "") {
                temp[tempData] = data[tempData];
              }
            }
          } else if (
            !tempData.includes("error") &&
            !tempData.includes("required") &&
            !tempData.includes("exist") &&
            !tempData.includes("disable")
          ) {
            if (
              data[tempData].toString().trim() === "" &&
              data[`${tempData}_required`]
            ) {
              if (
                data["exist"] === true &&
                tempData != "amount" &&
                data[`${tempData}_disable`] !== true
              ) {
                data[tempData + "_error"] = "This field is Mandatory";
                test = false;
              }
            } else {
              if (data[tempData].toString().trim() !== "") {
                temp[tempData] = data[tempData].toString().trim();
              }
            }
          }
        });
        if (Object.keys(temp).length !== 0) {
          field.push(temp);
        }
        temp = {};
      });
    }
    if (!duplicateTest || !emptyTest) {
      test = false;
    }
    this.setState({
      fieldValue,
    });

    return test;
  };

  deleteField = (i) => {
    let { fieldValue } = this.state;
    fieldValue.splice(i, 1);
    this.setState({ fieldValue }, () => {
      this.validateDuplicateField("delete");
    });
  };

  handleEditStore = (index) => {
    let { fieldValue } = this.state;
    this.setState({
      selected_details: fieldValue[index]?.["store_list"] ?? [],
      isEdit: true,
      storeIndex: index,
      isOpenStore: true,
    });
  };

  renderFields = (data, index, fieldDetails) => {
    const { drop_down_list } = this.state;
    return fieldDetails.map((field, keyIndex) => {
      let textAlign = "";
      if (field.name === "amount") {
        textAlign = "right";
      }
      let gridClassName = field.gridClassName;
      if (field.name === "amount" && data.amount_disable === "store") {
        return (
          <Box
            key={keyIndex}
            className={`${gridClassName} d-flex align-items-center`}
          >
            <TextField
              id={field.id}
              label="Total Amount"
              fullWidth
              autoComplete="off"
              name={field.name}
              value={data[field.name]}
              // InputLabelProps={{
              //     shrink: true,
              // }}
              required={field.required}
              className={field.className}
              rows={field.rows}
              variant="outlined"
              disabled="true"
              inputProps={{
                maxLength: field.maxLength,
                className: field.is_amount_field ? "text-align-right" : "",
              }}
              helperText={
                data[field.name + "_error"] === ""
                  ? ""
                  : data[field.name + "_error"]
              }
            />
            <Tooltip
              title={"Modify Store Items"}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <div
                className="pl-10 pointer"
                onClick={() => this.handleEditStore(index)}
              >
                <EditIcon />
              </div>
            </Tooltip>
          </Box>
        );
      } else if (field.name === "amount" && data.amount_disable) {
        return (
          <Box key={keyIndex} className={gridClassName}>
            <TextField
              id={field.id}
              label="Number of months"
              fullWidth
              autoComplete="off"
              name={field.name}
              value="1"
              required={field.required}
              className={field.className}
              autoFocus={field.autoFocus}
              onBlur={(e) => this.changeInParent(e, field, index)}
              rows={field.rows}
              variant="outlined"
              disabled="true"
              inputProps={{
                maxLength: field.maxLength,
                className: field.is_amount_field ? "text-align-right" : "",
              }}
              helperText={
                data[field.name + "_error"] === ""
                  ? ""
                  : data[field.name + "_error"]
              }
            />
          </Box>
        );
      }
      return (
        <Box key={keyIndex} className={gridClassName}>
          {field.type === "amount" && data.amount_disable === false && (
            <TextField
              id={field.id}
              label={field.label}
              fullWidth
              autoComplete="off"
              name={field.name}
              value={data[field.name]}
              required={field.required}
              InputProps={{
                inputComponent: NumberFormatCustom,
              }}
              className={field.className}
              autoFocus={field.autoFocus}
              onBlur={(e) => this.changeInParent(e, field, index)}
              rows={field.rows}
              variant="outlined"
              inputProps={{
                maxLength: field.maxLength,
                style: { textAlign: textAlign },
              }}
              helperText={
                data[field.name + "_error"] === ""
                  ? ""
                  : data[field.name + "_error"]
              }
              error={data[field.name + "_error"] === "" ? false : true}
              onChange={(e) => this.handleSearchChange(e, field, index)}
            />
          )}
          {field.type === "drop_down" && data[field.name] !== undefined && (
            <Dropdown
              data={field.list}
              name={field.name}
              value={data[field.name]}
              onChange={(e) => this.handleSearchChange(e, field, index)}
              error={data[field.name + "_error"]}
              label={field.label}
              style={field.className}
              required={field.required}
              hideSelect={field.hideSelect}
              fullWidth
            />
          )}
          {field.type === "dropDownWithSearch" &&
            data[field.name] !== undefined && (
              <DropDownWithSearch
                options={field.list}
                value={data[field.name]}
                optionValue={field.optionValue}
                onChange={(e, newValue) =>
                  this.handleSearchChange(newValue, field, index)
                }
                name={field.name}
                label={field.label}
                required={field.required}
                className={field.className}
                disabled={field.disabled}
                helperText={
                  data[field.name + "_error"] === ""
                    ? ""
                    : data[field.name + "_error"]
                }
                error={
                  data[field.name + "_error"] === ""
                    ? ""
                    : data[field.name + "_error"]
                }
                hideClearIcon={true}
              />
            )}
          {field.type === "radio" && data[field.name] !== undefined && (
            <div>
              {field.label} ?
              {field.radioOptions.map((tempData, kindex) => {
                return (
                  <label key={kindex}>
                    <input
                      type="radio"
                      value={tempData.id}
                      checked={data[field.name] == tempData.id ? true : false}
                      defaultChecked={
                        data[field.name] === tempData.id ? true : false
                      }
                      onChange={(e) => this.handleSearchChange(e, field, index)}
                    />{" "}
                    {tempData.name}
                  </label>
                );
              })}
            </div>
          )}
        </Box>
      );
    });
  };

  handleOpenStore = () => {
    this.setState({
      isOpenStore: !this.state.isOpenStore,
    });
  };

  getTotalAmount = (items) => {
    let totalAmount = 0;
    items.map((data) => {
      totalAmount += data.unit_price ? parseFloat(data.unit_price) : 0;
    });
    return totalAmount;
  };

  updateParent = (items) => {
    let fieldValue = _.cloneDeep(this.state.fieldValue);
    let { storeIndex } = this.state;
    fieldValue[storeIndex]["store_list"] = items;
    fieldValue[storeIndex]["amount"] = this.getTotalAmount(items);
    fieldValue[storeIndex]["amount_error"] = "";
    this.setState({
      isOpenStore: false,
      fieldValue: [...fieldValue],
    });
    this.props.updateParent(fieldValue);
  };

  render() {
    const { name } = this.props;
    const { fieldValue, fieldDetails, isOpenStore, isEdit, selected_details } =
      this.state;
    return (
      <Box pb={5} mb={3}>
        {fieldValue.map((data, index) => (
          <Grid
            container
            key={index}
            className="position-relative text-field-block"
          >
            <Paper
              className="paper-plain-background"
              style={{
                paddingTop: "15px !important",
                paddingBottom: "15px !important",
              }}
            >
              {fieldValue.length > 1 && (
                <Box className="red-text close-icon-text-fields-box">
                  <HighlightOffIcon
                    className="cross-btn-nominee end-flex-prop close-icon-text-fields"
                    onClick={() => this.deleteField(index)}
                  />
                </Box>
              )}
              <Box className="list-of-text-fields-flex" mt={2} mb={2}>
                {this.renderFields(data, index, fieldDetails)}
              </Box>
              <div></div>
            </Paper>
            <br />
            {index === fieldValue.length - 1 && (
              <Grid item md={12} xs={12} sm={12}>
                <Box className="end-flex-prop margin-top-10">
                  <Button
                    variant="contained"
                    onClick={this.addNew}
                    className="editbutton-view"
                  >
                    <ControlPointOutlinedIcon className="visibility-icon" />{" "}
                    <FormattedMessage {...commonMessages.addMore} /> {name}
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        ))}
        {isOpenStore && (
          <FeePlanAddStoreItems
            handleOpenStore={this.handleOpenStore}
            isEdit={isEdit}
            updateParent={this.updateParent}
            selected_details={selected_details}
          />
        )}
      </Box>
    );
  }
}

export default FeesTypeFields;
