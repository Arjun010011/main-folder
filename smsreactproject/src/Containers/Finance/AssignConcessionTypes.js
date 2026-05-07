import React, { Component } from "react";
import { withRouter, Link } from "react-router-dom";
import { Grid, Paper, Box, Button, Snackbar } from "@material-ui/core";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Swal from "sweetalert2";

import { Dropdown } from "Components/DropDown";
import DynamicForm from "Components/DynamicForm";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import MultipleAddTextFields from "Components/MultipleAddTextFields";
import LoadingGif from "Components/LoadingGif";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { amountRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { SUCCESS_MSG_PROPS, TRANSPORT_CODE } from "Constants";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Alert, getUrlParam } from "Includes/functions";
import { validateAmount, validatePercent } from "Includes/validations";
import { GET_URL, POST_URL } from "Includes/urls";

const options = {
  selectableRows: "none",
  filterType: "dropdown",
  responsive: false,
  filter: false,
  download: false,
  print: false,
  viewColumns: false,
  rowsPerPageOptions: [],
  rowsPerPage: 5,
};

const fee_type_concission_global = [
  {
    label: "Fee Type",
    regex: null,
    autoFocus: false,
    name: "standard_fee",
    md: 6,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "drop_down",
    gridClassName: "margin-vertical-20",
    update_status_from_parent: true,
  },
  {
    label: "Rate",
    regex: amountRegex,
    autoFocus: false,
    name: "rate",
    md: 6,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    allowDuplicates: true,
    maxLength: 7,
    gridClassName: "margin-vertical-20",
  },
  {
    label: "Concession in Percentage",
    regex: null,
    autoFocus: false,
    name: "is_percentage",
    md: 6,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: false,
    rows: null,
    type: "checkbox",
    allowDuplicates: true,
    gridClassName: "margin-vertical-20",
  }
];

const total_amount_concission_global = [
  {
    label: "Rate",
    regex: amountRegex,
    autoFocus: false,
    name: "rate",
    md: 6,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    allowDuplicates: true,
    maxLength: 5,
    gridClassName: "margin-vertical-20",
  },
  {
    label: "Concession in Percentage",
    regex: null,
    autoFocus: false,
    name: "is_percentage",
    md: 6,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: false,
    rows: null,
    type: "checkbox",
    allowDuplicates: true,
    gridClassName: "margin-vertical-20",
  },
];
const defaultTotalAmtconcessionMappingData = {
  concession_type: "",
  feetype: null,
  rate: 0,
  is_percentage: false,
};
class FeesType extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      submitting: false,
      snackbar: false,
      type: "feetype",
      feeConcessionMappingData: null,
      feeTypeConcessionDetails: null,
      selectedToggle: "feetype",
      concession_type: 0,
      totalAmtconcessionMappingData: {
        ...defaultTotalAmtconcessionMappingData,
      },
      columns: [
        {
          name: "standard_fee_name",
          label: "Fee Type",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "amount",
          label: "Rate",
          options: {
            filter: false,
            sort: true,
          },
        },
      ],
    };
  }

  componentDidMount() {
    let { year, standard } = getUrlParam();
    if (year && standard) {
      this.setState({ year, standard }, () => this.getConcessionTypeList());
    } else {
      this.props.history.push(Actions.assign_consission.view.url);
    }
  }

  getConcessionTypeList = () => {
    const { year, standard, concession_type } = this.state;
    let params = {
      academic_year: year,
      standard: standard,
      is_active: 1,
    };
    if (concession_type) {
      params.concession_type = concession_type;
    }
    getRequest(GET_URL.concessionfee.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let feeConcessionMappingData = response.data.data;
          let selectedToggle = feeConcessionMappingData.type
            ? feeConcessionMappingData.type
            : "feetype";

          feeConcessionMappingData.concession_fee.forEach((concession) => {
            concession.is_percentage = !concession.is_amount;
            if (concession.is_amount) {
              concession.amount = `₹ ${concession.rate}`;
            } else {
              concession.amount = `${concession.rate} %`;
            }
          });
          this.setState({ feeConcessionMappingData, selectedToggle }, () =>
            this.setDefaultValue()
          );
        }
      }
    );
  };

  setDefaultValue = () => {
    let { feeConcessionMappingData } = this.state;
    let feeTypeFieldDetails = [...fee_type_concission_global];
    let totalAmountFieldDetails = [...total_amount_concission_global];
    feeTypeFieldDetails.forEach((field) => {
      if (field.name === "standard_fee") {
        field["list"] = feeConcessionMappingData.standard_fee;
      } else if (field.name === "concession_type") {
        field["list"] = feeConcessionMappingData.concession_type;
      }
    });
    totalAmountFieldDetails.forEach((field) => {
      if (field.name === "concession_type") {
        field["list"] = feeConcessionMappingData.concession_type;
      }
    });
    this.setState({
      totalAmountFieldDetails,
      feeTypeConcessionDetails: feeTypeFieldDetails,
      loading: false,
    });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    let totalAmtconcessionMappingData = {
      ...defaultTotalAmtconcessionMappingData,
    };
    // if(type === "fee_type") {
    //   this.refs.concession.setDefaultValues();
    // }
    this.setState(
      {
        [name]: value,
        totalAmtconcessionMappingData,
        feeTypeConcessionDetails: null,
      },
      () => {
        if (name === "concession_type") {
          this.getConcessionTypeList();
        }
      }
    );
  };

  getParameters = () => {
    const {
      selectedToggle,
      year,
      standard,
      concession_type,
      concessionMappingData,
      totalAmountFieldDetails,
      totalAmtconcessionMappingData,
      feeConcessionMappingData,
    } = this.state;
    let payload = { academic_year: year, standard, concession_type };
    if (
      feeConcessionMappingData &&
      feeConcessionMappingData.concession_fee.length > 0
    ) {
      payload.concession =
        feeConcessionMappingData.concession_fee[0].concession;
    }
    let error = {};
    if (selectedToggle === "feetype") {
      let feeMapping = {};
      feeConcessionMappingData.standard_fee.forEach((fee) => {
        feeMapping[fee.id] = {
          amount: fee.amount,
          name: fee.name,
        };
      });
      payload.type = "feetype";
      let concession_types = [];
      for (let conc of concessionMappingData) {
        conc.is_amount = !conc.is_percentage;
        let test = { errorFound: false };
        if (conc.is_amount) {
          test = validateAmount(
            conc.rate,
            true,
            0,
            feeMapping[conc.standard_fee].amount
          );
        } else {
          test = validatePercent(conc.rate, true);
        }
        if (test.errorFound) {
          test.errorText = `${test.errorText} for fee type ${feeMapping[conc.standard_fee].name
            }`;
          return test;
        } else {
          let data = {
            is_amount: conc.is_amount,
            rate: parseFloat(conc.rate),
            standard_fee: conc.standard_fee,
          };
          concession_types.push(data);
        }
      }
      payload.concession_types = concession_types;
    } else {
      payload.type = "total";
      let concessionType = {
        is_amount: !totalAmtconcessionMappingData.is_percentage,
      };
      totalAmountFieldDetails.forEach((field) => {
        let name = field.name;
        let value = totalAmtconcessionMappingData[name];
        if (name === "rate") {
          let test = {};
          if (concessionType.is_amount) {
            test = validateAmount(value, true, 1);
          } else {
            test = validatePercent(value, true);
          }
          if (test.errorFound) {
            error["error"] = { [field.name]: test.errorText };
          } else {
            concessionType[name] = parseFloat(value);
          }
        } else {
          concessionType[name] = value;
        }
      });
      payload.concession_types = [concessionType];
      if (Object.keys(error).length !== 0) {
        payload = {
          errorFound: true,
          ...error,
        };
        return payload;
      }
    }
    return payload;
  };

  submit = () => {
    const payload = this.getParameters();
    const { selectedToggle } = this.state;
    if (selectedToggle === "total" && payload.errorFound) {
      this.refs.concessionTotal.updateErrors(payload.error);
      this.setState({ snackbar: true, alertData: "Clear all the errors" });
      return;
    }
    if (
      selectedToggle === "feetype" &&
      !this.refs.concession.validateFields()
    ) {
      this.setState({ snackbar: true, alertData: "Clear all the errors" });
      return;
    } else if (selectedToggle === "feetype" && payload.errorFound) {
      this.setState({ snackbar: true, alertData: payload.errorText });
      return;
    }
    this.setState({ submitting: true });
    const url = POST_URL.concession.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        this.props.history.push(Actions.assign_consission.view.url);
        Swal.fire({
          ...SUCCESS_MSG_PROPS,
          title: response.data.Reason,
        });
      }
      this.setState({ submitting: false });
    });
  };

  updateConcessionMappingData = (concessionMappingData) => {
    this.setState({
      concessionMappingData,
      totalAmtconcessionMappingData: {
        ...defaultTotalAmtconcessionMappingData,
      },
    });
  };

  updateTotalAmtConcessionMappingData = (name, value) => {
    let { totalAmtconcessionMappingData } = this.state;
    totalAmtconcessionMappingData[name] = value;
    this.setState({
      totalAmtconcessionMappingData,
      concessionMappingData: null,
    });
  };

  handleCloseSnackbar = () => {
    this.setState({ snackbar: false, alertData: "" });
  };

  changeToggle = (event, value) => {
    const { feeConcessionMappingData } = this.state;
    if (
      feeConcessionMappingData.type &&
      feeConcessionMappingData.type !== value
    ) {
      let concessionType = "Concession on Total Amount";
      let otherConcessionType = "Concession on Fee Type";
      if (feeConcessionMappingData.type === "feetype") {
        concessionType = "Concession on Fee Type";
        otherConcessionType = "Concession on Total Amount";
      }

      const snackbar = {
        alertData: ` ${concessionType} already opted. To opt ${otherConcessionType} concession, delete ${concessionType} for this concession type`,
        snackbar: true,
      };
      this.setState({ ...snackbar });
      return;
    }
    if (value !== null) {
      this.setState({
        selectedToggle: value,
      });
    }
  };
  updateFromParent = (fieldValue, field, index, name) => {
    const { standard_fee } = fieldValue[index];
    let selected_standard_fee_type = {};
    field.list.forEach((data) => {
      if (data.id === standard_fee) {
        selected_standard_fee_type = data;
      }
    });

    let amount = `₹ ${selected_standard_fee_type.amount}`;
    fieldValue[index].is_percentage_unshow = false;

    if (selected_standard_fee_type.fee_type_codename === TRANSPORT_CODE) {
      amount = `${selected_standard_fee_type.amount} %`;
      fieldValue[index].is_percentage = true;
      fieldValue[index].is_percentage_unshow = true;
    }
    // fieldValue[index]['allowDuplicates'] = true;
    fieldValue[index]['is_percentage_unshow_allow_duplicates'] = true;
    fieldValue[index]['is_percentage_allow_duplicates'] = true;
    fieldValue[index]["rate"] = "";
    fieldValue[index][`${name}_helper_text`] = `Fee Amount: ${amount}`;

    this.refs.concession.uptateFieldValues(fieldValue);
  };
  render() {
    const {
      loading,
      columns,
      snackbar,
      alertData,
      submitting,
      selectedToggle,
      concession_type,
      totalAmountFieldDetails,
      feeConcessionMappingData,
      feeTypeConcessionDetails,
    } = this.state;

    if (loading) return <LoadingGif />;
    return (
      <>
        <Paper className="paper-background">
          <Box>
            <Grid item container>
              <Grid item md={6} xs={12} className="header-align">
                <Box className="heading">{`Manage ${alias_names['standard']} Concession`}</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.assign_consission.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.assign_consission.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Box px={2}>
              {feeConcessionMappingData && (
                <Box className="md-up-justify-start md-down-justify-space-evenly mb-y-20">
                  <Box className="year-std-box">
                    <Box className="academic-std-head"> Academic Year</Box>
                    <Box className=" aca-std-white-background">
                      {feeConcessionMappingData.academic_year_value}
                    </Box>
                  </Box>
                  <Box className="year-std-box standards-create-fee">
                    <Box className="academic-std-head">Standards</Box>
                    <Box className="aca-std-white-background  ">
                      {feeConcessionMappingData.standard_name}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
            <Box className="flex-justify-space-between">
              <Box px={2}>
                {feeConcessionMappingData && (
                  <Dropdown
                    data={feeConcessionMappingData.concession_type}
                    name="concession_type"
                    value={concession_type}
                    onChange={this.onChange}
                    label="Select Concession"
                  />
                )}
              </Box>
              {concession_type !== 0 && (
                <Box className="float-right">
                  <ToggleButtonGroup
                    size="small"
                    value={selectedToggle}
                    exclusive
                    onChange={this.changeToggle}
                  >
                    <ToggleButton key={1} value="feetype">
                      Concession on Fee type
                    </ToggleButton>
                    ,
                    <ToggleButton key={2} value="total">
                      Concession on Total
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}
            </Box>
            {feeConcessionMappingData &&
              ((feeConcessionMappingData.type === "feetype" &&
                feeConcessionMappingData.standard_fee.length > 0) ||
                (feeConcessionMappingData.type === "total" &&
                  feeConcessionMappingData.concession_fee.length === 0) ||
                feeConcessionMappingData.type === null) && (
                <Box px={2}>
                  <Grid container spacing={4}>
                    <Grid item md={7} lg={7} xl={7}>
                      {feeTypeConcessionDetails && concession_type !== 0 && (
                        <Grid container>
                          {selectedToggle === "feetype" ? (
                            <Grid item xl={12} lg={12} md={12}>
                              <MultipleAddTextFields
                                fieldDefaultValue={[]}
                                fieldDetails={feeTypeConcessionDetails}
                                updateParent={this.updateConcessionMappingData}
                                isEmptyNotAllowed={true}
                                ref={"concession"}
                                updateFromParent={this.updateFromParent}
                                idFormat={'assign_concession_2022_08_11_2_pm_'}
                              />
                              <Box className="end-flex-prop  margin-top-30">
                                <Box>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    className="submit"
                                    disabled={submitting}
                                    onClick={this.submit}
                                  >
                                    Submit
                                  </Button>
                                </Box>
                              </Box>
                            </Grid>
                          ) : (
                            <Grid
                              item
                              xl={12}
                              lg={12}
                              md={12}
                              className="margin-top-30"
                            >
                              <Paper>
                                <Grid container className="padding-22">
                                  <Grid
                                    item
                                    md={8}
                                    xs={12}
                                    sm={12}
                                    className="bank-details-grid1"
                                  >
                                    <DynamicForm
                                      fieldDetails={totalAmountFieldDetails}
                                      updateParent={
                                        this.updateTotalAmtConcessionMappingData
                                      }
                                      loading={loading}
                                      ref={"concessionTotal"}
                                      idFormat={'finance_consession_2022_08_11_01_23_pm_'}
                                    />
                                  </Grid>
                                </Grid>
                              </Paper>
                              <Box className="end-flex-prop  margin-top-30">
                                <Box>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    className="submit"
                                    disabled={submitting}
                                    onClick={this.submit}
                                  >
                                    Submit
                                  </Button>
                                </Box>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      )}
                    </Grid>

                    {feeTypeConcessionDetails &&
                      feeConcessionMappingData &&
                      concession_type !== 0 &&
                      selectedToggle === "feetype" && (
                        <Grid item md={5} lg={5} xl={5}>
                          <Box className="fee-det-table">
                            <AllMUIDataTable
                              key={feeConcessionMappingData.concession_fee}
                              title={"Fee Concession Details"}
                              data={feeConcessionMappingData.concession_fee}
                              columns={columns}
                              options={options}
                            />
                          </Box>
                        </Grid>
                      )}
                  </Grid>
                </Box>
              )}
            <Grid item md={12} lg={12}>
              {concession_type === 0 && (
                <Paper className="margin-top-20">
                  <BlankPagewithIcon data="Select concession type to set concession" />
                </Paper>
              )}
            </Grid>

            {feeConcessionMappingData &&
              feeConcessionMappingData.type === "feetype" &&
              feeConcessionMappingData.standard_fee.length === 0 && (
                <Grid item md={12} lg={12}>
                  <Paper className="margin-top-20">
                    <BlankPagewithIcon data="Concession provided for all available fee types" />
                  </Paper>
                </Grid>
              )}
            {feeConcessionMappingData &&
              feeConcessionMappingData.type === "total" &&
              feeConcessionMappingData.concession_fee.length !== 0 && (
                <Grid item md={12} lg={12}>
                  <Paper className="margin-top-20">
                    <BlankPagewithIcon
                      data={`Concession(Total) already found for this ${alias_names['standard']} with cocession amount of ${feeConcessionMappingData.concession_fee[0].is_amount
                          ? "₹ " +
                          feeConcessionMappingData.concession_fee[0].rate
                          : feeConcessionMappingData.concession_fee[0].rate +
                          "%"
                        }`}
                    />
                  </Paper>
                </Grid>
              )}
            {feeConcessionMappingData &&
              feeConcessionMappingData.type === null &&
              feeConcessionMappingData.standard_fee.length === 0 && (
                <Grid item md={12} lg={12}>
                  <Paper className="margin-top-20">
                    <BlankPagewithIcon
                      data={`Fee Plan is not done for this standard.`}
                    />
                  </Paper>
                </Grid>
              )}
          </Box>
        </Paper>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={8000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </>
    );
  }
}
export default withRouter(FeesType);
