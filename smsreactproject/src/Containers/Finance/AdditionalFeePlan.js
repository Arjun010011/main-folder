import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@material-ui/core";
import { Link } from "react-router-dom";

import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import commonMessages from "Constants/messages";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import Snackbar from "@material-ui/core/Snackbar";
import "./styles.scss";
import LoadingGif from "Components/LoadingGif";
import { MODE_OF_PAYMENTS } from "Constants";
import {
  isUserHasPermission,
  Alert,
  getValuesInArrayUsingKey,
} from "Includes/functions";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { DeleteOutline } from "@material-ui/icons";
import { amountRegexWithDecimals } from "Constants/regularExpression";

class AdditionalFeePlan extends Component {
  constructor(props) {
    super(props);
    this.state = {
      submitDisable: false,
      loading: true,
      fieldDetails: null,
      fieldList: [
        {
          additional_charge_type: "",
          is_percentage: false,
          fees: "",
          apply_on_payment_mode: [],
          desciption: "",
        },
      ],
      feeTypeList: [],
      fieldErrors: {},
      paymentModeList: MODE_OF_PAYMENTS,
      openError: false,
      alertData: "",
      name: "",
    };
  }

  componentDidMount = () => {
    this.getFinanceTypeList();
  };

  getFinanceTypeList = () => {
    const url = GET_URL.additionalchargetype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          feeTypeList: response.data.data,
          loading: false,
        });
      }
    });
  };

  postMethod = (data_list) => {
    this.setState({ submitDisable: true });
    let payload = { data_list };
    let url = POST_URL.additionalchargetype.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.additional_fee_plan.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };

  handleDropDownWithSearchChange = (e, newValue, name, index) => {
    let { fieldList, fieldErrors } = this.state;
    fieldList[index][name] = newValue;
    delete fieldErrors[`${index}_${name}`];
    this.setState({
      fieldList,
      fieldErrors,
    });
  };

  handleSearchChange = (e, index) => {
    let { name, value } = e.target;
    let { fieldList, fieldErrors } = this.state;
    if (name === "is_percentage") {
      value = !fieldList[index][name];
    }
    fieldList[index][name] = value;
    delete fieldErrors[`${index}_${name}`];
    this.setState({
      fieldList,
      fieldErrors,
    });
  };

  handlePaymentChange = (e, index) => {
    let { fieldList, fieldErrors } = this.state;
    fieldList[index]["apply_on_payment_mode"] = e;
    delete fieldErrors[`${index}_apply_on_payment_mode`];
    this.setState({
      fieldList,
      fieldErrors,
    });
  };

  handleAddNew = () => {
    let { fieldList } = this.state;
    let temp = {
      additional_charge_type: "",
      is_percentage: false,
      fees: "",
      apply_on_payment_mode: [],
      desciption: "",
    };
    fieldList.push(temp);
    this.setState({
      fieldList,
    });
  };

  handleDeleteRow = (index) => {
    let { fieldList } = this.state;
    fieldList.splice(index, 1);
    this.setState({
      fieldList,
    });
  };

  handleValidationFields = () => {
    let { fieldList, fieldErrors, name } = this.state;
    fieldErrors = {};
    let returnResult = true;
    let tempFieldMap = [];
    let post_data = [];
    if (!name) {
      fieldErrors[`name`] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnResult = false;
    }
    fieldList.map((data, index) => {
      if (!data["additional_charge_type"]) {
        fieldErrors[`${index}_additional_charge_type`] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        returnResult = false;
      } else {
        if (tempFieldMap.includes(data.additional_charge_type)) {
          fieldErrors[`${index}_additional_charge_type`] = `Duplicate(s) Found`;
          returnResult = false;
        } else {
          tempFieldMap.push(data.additional_charge_type);
        }
      }
      if (!data["fees"]) {
        fieldErrors[`${index}_fees`] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        returnResult = false;
      } else {
        if (
          data.is_percentage &&
          (!amountRegexWithDecimals.value.test(data["fees"]) ||
            parseFloat(data["fees"]) < 0 ||
            parseFloat(data["fees"]) > 100)
        ) {
          fieldErrors[`${index}_fees`] = "Invalid Amount (Ex: 1%-100%)";
          returnResult = false;
        } else if (
          !data.is_percentage &&
          !amountRegexWithDecimals.value.test(data["fees"])
        ) {
          fieldErrors[`${index}_fees`] = "Invalid Amount";
          returnResult = false;
        }
      }
      if (
        !data["apply_on_payment_mode"] ||
        data["apply_on_payment_mode"].length === 0
      ) {
        fieldErrors[`${index}_apply_on_payment_mode`] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        returnResult = false;
      }
      post_data.push({
        name: name,
        additional_charge_type: data.additional_charge_type["id"],
        description: data.description,
        fees: parseFloat(data.fees),
        is_percentage: data.is_percentage,
        apply_on_payment_mode:
          data.apply_on_payment_mode.length > 0
            ? getValuesInArrayUsingKey(data.apply_on_payment_mode, "id").join(
                ","
              )
            : "",
      });
    });
    this.setState({
      fieldErrors,
    });
    if (returnResult) {
      returnResult = { data_list: post_data };
    } else {
      this.setState({
        openError: true,
        alertData: "Clear the error(s)",
      });
    }
    return returnResult;
  };

  saveData = () => {
    let payload = this.handleValidationFields();
    if (payload) {
      let url = POST_URL.additionalcharge.api;
      postRequest(url, payload, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.additional_fee_plan.view.url);
        }
      });
    }
  };

  handleChange = (e) => {
    let { name, value } = e.target;
    let { fieldErrors } = this.state;
    delete fieldErrors[name];
    this.setState({
      [name]: value,
      fieldErrors,
    });
  };

  render() {
    const {
      submitDisable,
      loading,
      fieldList,
      feeTypeList,
      fieldErrors,
      paymentModeList,
      openError,
      name,
      alertData,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    }
    return (
      <div>
        <Paper className={"paper-background"}>
          <Grid container>
            <Grid item md={7} xs={12} sm={12}>
              <Box className="header-align heading">
                Additional Charges Fee Plan
              </Box>
            </Grid>
            <Grid item md={5} xs={12} sm={12}>
              <Box className="end-flex-prop header-align">
                {isUserHasPermission("additional_fee_plan", "view") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.additional_fee_plan.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.additional_fee_plan.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <div className="mt-20">
            <TextField
              required
              autoComplete="off"
              label={"Name"}
              name="name"
              type="text"
              value={name}
              className="width-300px background-white"
              inputProps={{ maxLength: "250" }}
              variant="outlined"
              onChange={(e) => this.handleChange(e)}
              size="small"
              helperText={fieldErrors[`name`] && fieldErrors[`name`]}
              error={fieldErrors[`name`] && fieldErrors[`name`]}
            />
          </div>
          {fieldList.map((data, index) => {
            return (
              <Paper className="paper-plain-background mt-30 padding-20">
                <Grid container key={index} spacing={1}>
                  <Grid item md={3} xs={12}>
                    <DropDownWithSearch
                      options={feeTypeList}
                      value={data.additional_charge_type}
                      onChange={(e, newValue) =>
                        this.handleDropDownWithSearchChange(
                          e,
                          newValue,
                          "additional_charge_type",
                          index
                        )
                      }
                      name="feetype"
                      label={
                        <FormattedMessage {...messages.additionalFeeType} />
                      }
                      optionValue="name"
                      className="width-100"
                      helperText={
                        fieldErrors[`${index}_additional_charge_type`] &&
                        fieldErrors[`${index}_additional_charge_type`]
                      }
                      error={
                        fieldErrors[`${index}_additional_charge_type`] &&
                        fieldErrors[`${index}_additional_charge_type`]
                      }
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item md={2} xs={12}>
                    <div className="margin-top-15">
                      <FormControlLabel
                        className="width-100-per flex-justify-center-flex-prop d-flex"
                        control={
                          <Switch
                            checked={data.is_percentage}
                            id={`${index}is_percentage`}
                            name={"is_percentage"}
                            value={data.is_percentage}
                            color="primary"
                            onChange={(e) => this.handleSearchChange(e, index)}
                          />
                        }
                        label={"Is Percentage"}
                      />
                    </div>
                  </Grid>
                  <Grid item md={3} xs={12}>
                    <TextField
                      required
                      autoComplete="off"
                      label={data.is_percentage ? "Percentage" : "Fees"}
                      name="fees"
                      type="text"
                      value={data.fees}
                      className="width-100"
                      inputProps={{ maxLength: "8" }}
                      variant="outlined"
                      onChange={(e) => this.handleSearchChange(e, index)}
                      size="small"
                      helperText={
                        fieldErrors[`${index}_fees`] &&
                        fieldErrors[`${index}_fees`]
                      }
                      error={
                        fieldErrors[`${index}_fees`] &&
                        fieldErrors[`${index}_fees`]
                      }
                    />
                  </Grid>
                  <Grid item md={3} xs={11} className="margin-top-15">
                    <MultipleSelectDropdown
                      required={true}
                      data_list={paymentModeList}
                      selected_list={data.apply_on_payment_mode}
                      className="width-100-per"
                      label={"Payment Mode"}
                      onChange={(e) => this.handlePaymentChange(e, index)}
                      size="small"
                      error={
                        fieldErrors[`${index}_apply_on_payment_mode`] &&
                        fieldErrors[`${index}_apply_on_payment_mode`]
                      }
                    />
                  </Grid>
                  <Grid item md={1} xs={1} className="margin-top-20">
                    {fieldList.length > 1 && (
                      <DeleteOutline
                        className="text-red add-icon-stock-item pointer"
                        onClick={() => this.handleDeleteRow(index)}
                      />
                    )}
                  </Grid>
                  <Grid item md={11} xs={11}>
                    <TextField
                      autoComplete="off"
                      label={"Description"}
                      name="desciption"
                      type="text"
                      value={data.desciption}
                      className="width-100"
                      inputProps={{ maxLength: "250" }}
                      variant="outlined"
                      onChange={(e) => this.handleSearchChange(e, index)}
                      size="small"
                      helperText={
                        fieldErrors[`${index}_desciption`] &&
                        fieldErrors[`${index}_desciption`]
                      }
                      error={
                        fieldErrors[`${index}_desciption`] &&
                        fieldErrors[`${index}_desciption`]
                      }
                    />
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
          <div className="text-align-end  mb-50">
            <Tooltip
              title="Add More"
              enterDelay={500}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <Button
                className="multiple-add-button"
                onClick={this.handleAddNew}
              >
                <AddCircleOutlineOutlinedIcon className="multiple-add-button-icon" />
              </Button>
            </Tooltip>
          </div>
          <div className="submt-button-float-bottom" mt={3}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.saveData}
            >
              <FormattedMessage {...commonMessages.submit} />
            </Button>
          </div>
        </Paper>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={openError}
          autoHideDuration={2000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </div>
    );
  }
}

export default withRouter(AdditionalFeePlan);
