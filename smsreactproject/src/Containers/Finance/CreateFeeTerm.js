import React, { Component } from "react";
import { withRouter, Link } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Box, CircularProgress, Button, Paper, Grid } from "@material-ui/core";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Toolbar from "@material-ui/core/Toolbar";
import Dialog from "@material-ui/core/Dialog";
import AppBar from "@material-ui/core/AppBar";
import Slide from "@material-ui/core/Slide";

import FeeTermPlan from "Containers/Finance/Components/FeeTermPlan";
import { numberWithCommas } from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import {
  validateDate,
  Alert,
  dateFormat,
  getUrlParam,
} from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import {
  DATATABLEROWSPERPAGEOPT,
  TRANSPORT_CODE,
  CUSTOM_CODE,
} from "Constants";
import { FormattedMessage } from "react-intl";
import commonMessage from "Constants/messages";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

class CreateFeePlan extends Component {
  constructor(props) {
    super(props);
    this.state = {
      feePlanData: [],
      selectedFeePlan: {},
      feePlanwholeData: {},
      alertData: "",
      snackbar: false,
      permissions: ["create"],
      studentType: "",
      standardName: "",
      academicYearName: "",
      isOpen: true,
      submitDisable: false,
      expandedRowsIndex: [0],
    };
    this.columns = [
      {
        name: "id",
        options: {
          filter: false,
          sort: true,
          display: false,
        },
      },
      {
        name: "codename",
        options: {
          filter: false,
          sort: true,
          display: false,
        },
      },
      {
        name: "fee_type_name",
        label: "Fee Type",
        options: {
          filter: false,
        },
      },
      {
        name: "amount",
        label: "Total Amount",
        options: {
          filter: false,
          customBodyRender: (value, tableMeta) => {
            if (tableMeta.rowData[1] === TRANSPORT_CODE) {
              return `${value} (Number Of Months)`;
            } else {
              return numberWithCommas(value);
            }
          },
        },
      },
      {
        name: "total_terms",
        label: "Total Terms",
        options: {
          filter: false,
          customBodyRender: (value, tableMeta) => {
            if (
              tableMeta["rowIndex"] in this.state.feePlanData &&
              "standard_fee" in this.state.feePlanData[tableMeta["rowIndex"]] &&
              this.state.feePlanData[tableMeta["rowIndex"]]["standard_fee"]
                .length
            ) {
              return `${
                this.state.feePlanData[tableMeta["rowIndex"]]["standard_fee"]
                  .length
              }`;
            } else {
              return 0;
            }
          },
        },
      },
      {
        name: "standard_fee",
        options: {
          filter: false,
          sort: true,
          display: false,
        },
      },
    ];
    this.getFeeTypes = this.getFeeTypes.bind(this);
  }

  componentDidMount() {
    let { year, standard, studentType, standardName, academicYearName } =
      getUrlParam();
    if (year && standard && studentType) {
      this.setState({
        tableUpdating: true,
        studentType: studentType,
        standardName: standardName,
        academicYearName,
      });
      this.getFeeTypes(year, standard, studentType);
    } else {
      this.props.history.push(Actions.fee_term.view.url);
    }
  }

  getFeeTypes = (year, standard, studentType) => {
    const params = {
      academic_year: year,
      standard: standard,
      student_type: studentType,
    };
    getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let feePlanData = response.data.data.plan;
        if (feePlanData.is_approved) {
          this.props.history.push(Actions.fee_term.view.url);
          return;
        }
        if (feePlanData.length > 0) {
          feePlanData.forEach((plan, index) => {
            plan.standard_fee.forEach((fee) => {
              fee.term_alias = fee.term_alias ? fee.term_alias : fee.terms;
              fee.fee_fine_frequency_in_days = Math.round(
                fee.fee_fine_frequency_in_days
              );
              fee.fee_fine_rate = Math.round(fee.fee_fine_rate);
              fee.max_fee_fine_rate = Math.round(fee.max_fee_fine_rate);
              if (!Boolean(fee.payment_start_date)) {
                fee.payment_start_date = plan.academic_year_start_date;
                fee.payment_end_date = plan.academic_year_end_date;
                fee.term_start_date = plan.academic_year_start_date;
                fee.term_end_date = plan.academic_year_end_date;
              }
            });
            feePlanData[index]["total_terms"] = plan.standard_fee.length;
          });
        }
        this.setState({
          feePlanData,
          tableUpdating: false,
        });
      } else {
        this.setState({
          tableUpdating: false,
        });
      }
    });
  };

  showErrorPopUp = (text) => {
    this.setState({ snackbar: true, alertData: text });
  };
  validateTotalAmount = () => {
    let feePlanData = [...this.state.feePlanData];
    for (let fee_plan_index in feePlanData) {
      let data = feePlanData[fee_plan_index];
      const total_amount = data.codename === TRANSPORT_CODE ? 12 : data.amount;
      let total = 0;
      for (let standard_fee_ind in data.standard_fee) {
        let selectedFeeData = data.standard_fee[standard_fee_ind];
        let { amount } = selectedFeeData;

        if (!this.validateField(selectedFeeData, data)) {
          feePlanData[fee_plan_index].hasError = true;
          return false;
        } else {
          feePlanData[fee_plan_index].hasError = false;
        }
        if (amount < 1 && data.codename !== CUSTOM_CODE) {
          const text = `Fee Type: ${data.fee_type_name} and Term ${
            parseInt(standard_fee_ind) + 1
          } can not be zero!!`;
          this.showErrorPopUp(text);
          return false;
        }
        if (isNaN(amount)) {
          const text = `Fee Type: ${data.fee_type_name} and Term ${
            parseInt(standard_fee_ind) + 1
          } can not be special character!!`;
          this.showErrorPopUp(text);
          return false;
        }
        if (parseFloat(amount) < 0) {
          const text = `Fee Type: ${data.fee_type_name} and Term${
            parseInt(standard_fee_ind) + 1
          } has amount with negetive value!!`;
          this.showErrorPopUp(text);
          return false;
        }
        if (
          selectedFeeData.fee_fine_frequency_in_days ||
          selectedFeeData.fee_fine_rate ||
          selectedFeeData.max_fee_fine_rate
        ) {
          let text = "";
          if (
            selectedFeeData.fee_fine_frequency_in_days &&
            selectedFeeData.fee_fine_rate &&
            selectedFeeData.max_fee_fine_rate
          ) {
            if (
              selectedFeeData.fee_fine_rate > selectedFeeData.max_fee_fine_rate
            ) {
              text = "Maximum fine should be greater than fee fine";
              this.showErrorPopUp(text);
              return false;
            }
          } else {
            text = "Enter all the fine fields";
            this.showErrorPopUp(text);
            return false;
          }
        }
        let text = "";
        total = parseFloat(total) + parseFloat(amount);
        for (let standard_fee_child in data.standard_fee) {
          let childSelectedFeeData = data.standard_fee[standard_fee_child];
          if (
            selectedFeeData.term_alias &&
            childSelectedFeeData.term_alias &&
            selectedFeeData.term_alias === childSelectedFeeData.term_alias &&
            standard_fee_ind !== standard_fee_child
          ) {
            text = "Duplicate found in term alias";
            this.showErrorPopUp(text);
            return false;
          }
          if (
            selectedFeeData.terms &&
            childSelectedFeeData.terms &&
            selectedFeeData.terms === childSelectedFeeData.terms &&
            standard_fee_ind !== standard_fee_child
          ) {
            text = "Duplicate found in terms";
            this.showErrorPopUp(text);
            return false;
          }
        }
      }
      if (
        total !== total_amount &&
        data.codename === TRANSPORT_CODE &&
        total > 12
      ) {
        let text = `${data.fee_type_name} total amount and sum of terms amount is not matching.`;
        if (data.codename === TRANSPORT_CODE) {
          text = `${data.fee_type_name} number of months should between 1-12.`;
        }
        this.showErrorPopUp(text);
        return false;
      }
    }
    this.setState({ feePlanData });
    return true;
  };
  getPostData = () => {
    let feePlanData = [...this.state.feePlanData];
    for (let data of feePlanData) {
      for (let selectedFeeData of data.standard_fee) {
        selectedFeeData.term_start_date = dateFormat(
          selectedFeeData.term_start_date,
          "YYYY-MM-DD"
        );
        selectedFeeData.term_end_date = dateFormat(
          selectedFeeData.term_end_date,
          "YYYY-MM-DD"
        );
        selectedFeeData.payment_end_date = dateFormat(
          selectedFeeData.payment_end_date,
          "YYYY-MM-DD"
        );
        selectedFeeData.payment_start_date = dateFormat(
          selectedFeeData.payment_start_date,
          "YYYY-MM-DD"
        );
        selectedFeeData.rate = selectedFeeData.amount;
        selectedFeeData.fee_fine_frequency_in_days = Math.round(
          selectedFeeData.fee_fine_frequency_in_days
        );
        selectedFeeData.fee_fine_rate = Math.round(
          selectedFeeData.fee_fine_rate
        );
        selectedFeeData.max_fee_fine_rate = Math.round(
          selectedFeeData.max_fee_fine_rate
        );
        selectedFeeData.sequence = selectedFeeData.sequence
          ? selectedFeeData.sequence
          : null;
      }
    }
    return feePlanData;
  };
  submitFeeTems = () => {
    const url = POST_URL.feeplan.api;
    const postData = this.getPostData();
    if (this.validateTotalAmount()) {
      this.setState({ submitDisable: true }, () => {
        postRequest(url, postData, this.props).then((response) => {
          this.setState({ submitDisable: false });
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            });
            const { year, standard } = getUrlParam();
            this.getFeeTypes(year, standard);
            this.props.history.push(Actions.fee_term.view.url);
          }
        });
      });
    }
  };
  validateField = (selectedFeeData, data) => {
    let {
      term_start_date,
      term_end_date,
      payment_end_date,
      payment_start_date,
      terms,
    } = selectedFeeData;
    let validate_term_start_date = validateDate(
      term_start_date,
      null,
      null,
      "YYYY-MM-DD"
    );
    let validate_term_end_date = validateDate(
      term_end_date,
      null,
      null,
      "YYYY-MM-DD"
    );
    let validate_payment_end_date = validateDate(
      payment_end_date,
      null,
      null,
      "YYYY-MM-DD"
    );
    let validate_payment_start_date = validateDate(
      payment_start_date,
      null,
      null,
      "YYYY-MM-DD"
    );
    if (validate_payment_end_date !== "") {
      this.setState({
        alertData: `${validate_payment_end_date} for ${terms} payment end date to ${data.fee_type_name}`,
        snackbar: true,
        severity: "error",
      });
      return false;
    }
    if (validate_term_start_date !== "") {
      this.setState({
        alertData: `${validate_term_start_date} for  ${terms} term start date to ${data.fee_type_name}`,
        snackbar: true,
        severity: "error",
      });
      return false;
    }
    if (validate_term_end_date !== "") {
      this.setState({
        alertData: `${validate_term_start_date} for  ${terms} term end date to ${data.fee_type_name}`,
        snackbar: true,
        severity: "error",
      });
      return false;
    }
    if (validate_payment_start_date !== "") {
      this.setState({
        alertData: `${validate_payment_start_date} for  ${terms} payment start date to ${data.fee_type_name}`,
        snackbar: true,
        severity: "error",
      });
      return false;
    }
    return true;
  };
  updateFeeData = (selectedFeePlanData, validateFieldOtherFields) => {
    let feePlanData = [...this.state.feePlanData];
    for (let index in feePlanData) {
      let data = feePlanData[index];
      if (feePlanData[index].id === selectedFeePlanData.id) {
        feePlanData[index] = selectedFeePlanData;
        for (let standard_fee_ind in feePlanData[index].standard_fee) {
          let selectedStdFeeData =
            feePlanData[index].standard_fee[standard_fee_ind];
          feePlanData[index].hasError = false;
        }
        break;
      }
    }
    this.setState({ feePlanData });
  };

  getTitle = () => {
    if (this.state.tableUpdating || this.props.loading) {
      return <CircularProgress className="white-text" />;
    }
  };

  handleCloseSnackbar = () => {
    this.setState({ alertData: "", snackbar: false });
  };

  expandGivenRosws = (allRowsExpanded) => {
    let temprowsExpanded = allRowsExpanded.map((data) => {
      return data["index"];
    });
    this.setState({
      expandedRowsIndex: temprowsExpanded,
    });
  };

  handleClose = () => {
    const { studentType } = this.state;
    const searchParam = `?studentType=${studentType}`;
    this.setState({
      isOpen: false,
    });
    this.props.history.push({
      pathname: Actions.fee_term.view.url,
      search: searchParam,
    });
  };

  render() {
    const {
      feePlanData,
      permissions,
      submitDisable,
      academicYearName,
      snackbar,
      alertData,
      standardName,
      expandedRowsIndex,
      isOpen,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "responsive",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      expandableRows: true,
      search: false,
      expandableRowsHeader: false,
      rowsExpanded: expandedRowsIndex,
      onRowExpansionChange: (
        currentRowsExpanded,
        allRowsExpanded,
        rowsExpanded
      ) => {
        this.expandGivenRosws(allRowsExpanded);
      },
      renderExpandableRow: (rowData, rowMeta) => {
        return (
          <FeeTermPlan
            selectedFeePlan={feePlanData[rowMeta["rowIndex"]]}
            dataIndex={rowMeta["dataIndex"]}
            updateFeeData={this.updateFeeData}
          />
        );
      },
    };
    const disabled = !permissions.includes("create") ? true : false;
    return (
      <Box>
        <Dialog
          fullScreen
          open={isOpen}
          TransitionComponent={Transition}
          onClose={() => this.handleClose("close")}
        >
          <AppBar style={{ position: "sticky" }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="close"
                onClick={() => this.handleClose("close")}
              >
                <CloseIcon />
              </IconButton>
              <Box fontWeight="bold">
                <span className="margin-left-10 margin-right-10">
                  {Actions.fee_term.create.label}
                </span>
                <span className="margin-left-10 margin-right-10">
                  {academicYearName}
                </span>
                <span className="margin-left-10 margin-right-10">
                  {" "}
                  {standardName}{" "}
                </span>
              </Box>
            </Toolbar>
          </AppBar>
          <div className="padding-20">
            <Box mt={4}>
              <AllMUIDataTable
                data={feePlanData}
                key={feePlanData}
                title={this.getTitle()}
                columns={this.columns}
                options={options}
                onTableChange={this.changePage}
              />
            </Box>
            {!disabled && (
              <Box className="submt-button-float-bottom" mt={3}>
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  disabled={submitDisable} //{submitDisable}
                  onClick={this.submitFeeTems}
                >
                  submit
                </Button>
              </Box>
            )}
          </div>

          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={snackbar}
            autoHideDuration={10000}
            onClose={this.handleCloseSnackbar}
          >
            <Alert onClose={this.handleCloseSnackbar} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(CreateFeePlan);
