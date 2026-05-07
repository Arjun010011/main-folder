import React, { Component } from "react";
import { Grid, CircularProgress, Box, TextField } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";

import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { getElementOfIdInArray } from "Includes/functions";
import "./styles.scss";
import { NaturePeopleOutlined } from "@material-ui/icons";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import { cloneDeep } from "lodash";

import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

export default class index extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fieldErrors: {},
      datalist: {},
      address: {},
      addressLoading: { state: false, district: false, city: false },
      showDropDown: [],
      loading: true,
      fieldDetails: {
        label: "",
        regex: null,
        autoFocus: true,
        name: "name",
        md: 12,
        className: "w-100",
        required: true,
        id: "outlined-textarea",
        default: "",
        rows: null,
        type: "text",
        maxLength: 50,
        gridClassName: "margin-vertical-20",
      },
    };
  }

  componentDidMount = () => {
    this.setDefaultValues();
  };

  setDefaultValues = () => {
    let { address, fieldErrors } = this.state;
    const { addressDetails } = this.props;
    addressDetails.map((fields) => {
      address[fields.name] = fields.default;
      fieldErrors[fields.name] = "";
    });
    this.setState({ address, fieldErrors });
    this.getCountryList();
  };

  getCountryList = async () => {
    let datalist = { ...this.state.datalist };
    const url = GET_URL.country.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        datalist["country"] = response.data.data;
        let showDropDown = ["country"];
        this.setState(
          {
            datalist,
            loading: false,
            showDropDown,
          },
          () => {
            if (this.props.isEditForm) {
              this.props.addressDetails.forEach((data) => {
                this.handleDropDown(data.name, data.default, "isEdit");
              });
            } else {
              if (this.props?.updateList) {
                this.props.updateList(datalist);
              }
            }
          }
        );
      }
    });
  };

  handleChange = (e, field) => {
    let { fieldErrors, address } = this.state;
    let value = e.target.value;
    let name = e.target.name;
    fieldErrors[field.name] = "";
    address[name] = value;
    this.setState(
      {
        address,
        fieldErrors,
      },
      () => {
        this.updateParentAddress(address);
      }
    );
  };
  onBlurValidation = (e, field) => {
    let { fieldErrors, address } = this.state;
    let value = e.target.value;
    let name = e.target.name;
    fieldErrors[name] = "";
    if (field.required && (value === "" || value === null || value === 0)) {
      fieldErrors[name] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else if (field.regex && !field.regex.value.test(value) && value !== "") {
      fieldErrors[name] = field.regex.errorText;
    }
    this.setState(
      {
        fieldErrors,
      },
      () => {
        address[name] = value;
        this.updateParentAddress(address);
      }
    );
  };

  updateErrors = (fieldErrors) => {
    this.setState({
      fieldErrors: fieldErrors,
    });
  };

  handleDropDown = async (name, value, field) => {
    let getList;
    let url;
    let { fieldErrors, datalist, addressLoading, showDropDown, address } =
      this.state;
    if (value === "") {
      return;
    }
    if (value !== null || !field.required) {
      fieldErrors[name] = "";
      address[name] = value;
      let urlValue;
      if (
        field !== "isEdit" &&
        name !== "address" &&
        name !== "pincode" &&
        value !== null
      ) {
        urlValue = value.id;
        address[`${name}_name`] = value.name;
      } else {
        urlValue = value;
      }

      this.setState({
        address,
      });
      if (value === null) {
        if (name === "country") {
          showDropDown = ["country"];
          datalist["state"] = [];
          datalist["district"] = [];
          datalist["city"] = [];
          address["country"] = null;
          address["country_name"] = "";
          address["state"] = null;
          address["state_name"] = "";
          address["district"] = null;
          address["district_name"] = "";
          address["city"] = null;
          address["city_name"] = "";
        } else if (name === "city") {
          showDropDown = ["country", "state", "district", "city"];
          address["city"] = "";
          return;
        } else if (name === "state") {
          showDropDown = ["country", "state"];
          datalist["district"] = [];
          datalist["city"] = [];
          address["district"] = null;
          address["district_name"] = "";
          address["city"] = null;
          address["city_name"] = "";
        } else if (name === "district") {
          showDropDown = ["country", "state", "district"];
          datalist["city"] = [];
          address["city"] = null;
          address["city_name"] = "";
        }
        this.setState({
          address,
          datalist,
          showDropDown,
        });
        this.updateParentAddress(address);
        return;
      }
      if (name === "country") {
        showDropDown = ["country", "state"];
        if (field === "isEdit") {
          address["country"] = getElementOfIdInArray(
            datalist["country"],
            address["country"]
          );
        }
        url = GET_URL.getstatesforcountry.api;
        getList = "state";
        datalist["state"] = [];
        datalist["district"] = [];
        datalist["city"] = [];
        address["state"] = null;
        address["district"] = null;
        address["city"] = null;
      } else if (name === "city") {
        showDropDown = ["country", "state", "district", "city"];
        this.setState(
          {
            address,
            showDropDown,
          },
          () => {
            this.updateParentAddress(address);
          }
        );
        return;
      } else if (name === "state") {
        showDropDown = ["country", "state", "district"];
        url = GET_URL.getdistrictsforstate.api;
        getList = "district";
        datalist["district"] = [];
        datalist["city"] = [];
        address["district"] = null;
        address["city"] = null;
      } else if (name === "district") {
        showDropDown = ["country", "state", "district", "city"];
        url = GET_URL.getcitiesfordistrict.api;
        getList = "city";
        datalist["city"] = [];
        address["city"] = null;
      } else {
        return;
      }
      addressLoading[getList] = true;
      this.setState(
        {
          addressLoading,
          showDropDown,
        },
        () => {
          const params = {};
          const URL = url + urlValue + "/";
          getRequest(URL, params, this.props)
            .then((response) => {
              if (response && response.status === 200) {
                datalist[getList] = response.data.data;
              }
            })
            .then(() => {
              if (field === "isEdit") {
                address[getList] = getElementOfIdInArray(
                  datalist[getList],
                  address[getList]
                );
              }
              addressLoading[getList] = false;
              this.setState({
                datalist,
                addressLoading,
                fieldErrors,
                address,
                [getList]: "",
              });
              this.updateParentAddress(address);
              if (this.props.updateList) {
                this.props.updateList(datalist);
              }
            });
        }
      );
    } else if (field.required && value !== null) {
      fieldErrors[name] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    }
    this.setState({
      fieldErrors,
    });
  };

  updateParentAddress = (address) => {
    let addressTemp = { ...address };
    Object.keys(addressTemp).map((data) => {
      if (typeof addressTemp[data] === "object" && addressTemp[data]) {
        addressTemp[`${data}_name`] = addressTemp[data]["name"];
        addressTemp[data] = addressTemp[data]["id"];
      } else if (addressTemp[data] === null) {
        addressTemp[data] = "";
      }
    });
    this.props.updateParentAddress(addressTemp);
  };

  updatePostFormat = (newData, name) => {
    const { address } = this.state;
    let payload = {};
    if (name === "country") {
      payload = {
        countries: [{ name: newData[name], code: newData[name] }],
      };
    } else if (name === "state") {
      payload = {
        states: [{ name: newData[name], code: newData[name] }],
        country: address["country"]["id"],
      };
    } else if (name === "district") {
      payload = {
        districts: [{ name: newData[name], code: newData[name] }],
        state: address["state"]["id"],
        country: address["country"]["id"],
      };
    } else if (name === "city") {
      payload = {
        cities: [{ name: newData[name], code: newData[name] }],
        district: address["district"]["id"],
        state: address["state"]["id"],
        country: address["country"]["id"],
      };
    }

    return payload;
  };

  updateType = (field) => {
    // setReasonLoading(() => true);
    // let temp_list = [...reasonList];
    // temp_list.push(field);
    // setReasonList(() => temp_list);
    // setReasonLoading(() => false);
    return true;
  };

  render() {
    const {
      fieldErrors,
      datalist,
      showDropDown,
      addressLoading,
      address,
      loading,
      fieldDetails,
    } = this.state;
    const { addressDetails, loadingCountry, student_status } = this.props;
    return (
      <>
        {addressDetails.map((field, index) => {
          let tempDetails = cloneDeep(fieldDetails);
          tempDetails["label"] = field.label;
          tempDetails["name"] = field.name;
          return (
            <td
              className={
                student_status[index]?.["loading"]
                  ? `textAlign pl-15 opacity-0-5 pointer-event-none ${
                      field.type === "text" ? "width-150px" : "width-350px"
                    }`
                  : `textAlign pl-15 ${
                    field.type === "text" ? "width-150px" : "width-350px"
                  }`
              }
            >
              {(field.type === "text" || field.type === "multiline-text") &&
                ((field.parentRequired && address[field.parentRequired]) ||
                  !field.parentRequired) && (
                  <TextField
                    autoFocus={true}
                    id={field.id}
                    // label={field.label}
                    autoComplete="new-password"
                    name={field.name}
                    required={field.required}
                    value={address[field.name]}
                    inputProps={{
                      maxLength: field.maxLength,
                    }}
                    className={field.className}
                    fullWidth={field.className ? false : true}
                    rows={field.rows}
                    variant="standard"
                    helperText={
                      fieldErrors[field.name] === ""
                        ? ""
                        : fieldErrors[field.name]
                    }
                    error={
                      fieldErrors[field.name] &&
                      (fieldErrors[field.name] === "" ? false : true)
                    }
                    onChange={(e) => this.handleChange(e, field)}
                    onBlur={(e) => this.onBlurValidation(e, field)}
                  />
                )}
              {field.type === "DropDownWithSearch" &&
                showDropDown.includes(field.name) &&
                !addressLoading[field.name] &&
                !loadingCountry && (
                  // <DropDownWithSearchAndAddApi
                  //   options={reasonList}
                  //   value={reasonForAdjustment}
                  //   onChange={(e, newValue) => handleDropDown(e, newValue)}
                  //   name="reason"
                  //   label="Reason Name *"
                  //   optionValue="name"
                  //   className="width-100"
                  //   helperText={
                  //     reasonForAdjustmentError && reasonForAdjustmentError
                  //   }
                  //   error={reasonForAdjustmentError && reasonForAdjustmentError}
                  //   fieldDetails={fieldDetails}
                  //   postUrl={POST_URL.reason.api}
                  //   updatePostFormat={updatePostFormat}
                  //   updateType={updateType}
                  //   hideClearIcon
                  // />

                  <DropDownWithSearchAndAddApi
                    options={datalist[field.name]}
                    name={field.name}
                    value={address[field.name]}
                    onChange={(e, newValue) =>
                      this.handleDropDown(field.name, newValue, field, e)
                    }
                    error={fieldErrors[field.name]}
                    // label={field.label}
                    className={field.className}
                    parentClassName={field.parentClassName}
                    required={field.required}
                    fieldDetails={[tempDetails]}
                    postUrl={POST_URL[field.name].api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    hideClearIcon
                    variant="standard"
                    size="small"
                  />
                )}
              {field.type === "DropDownWithSearch" &&
                showDropDown.includes(field.name) &&
                addressLoading[field.name] && (
                  <Skeleton
                    variant="rect"
                    className="drop-down-skeleton-bulk"
                  ></Skeleton>
                )}
            </td>
          );
        })}
      </>
    );
  }
}
