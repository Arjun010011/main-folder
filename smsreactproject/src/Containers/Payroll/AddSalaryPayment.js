import React, { Component } from "react";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  Grid,
  Box,
  Button,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlined from "@material-ui/icons/VisibilityOutlined";
import { postRequestOnConfirm } from "Includes/api/apicall";
import Swal from "sweetalert2";
import classNames from "classnames";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import SalaryProfileView from "Containers/Payroll/Components/SalaryProfileView";
import {
  isUserHasPermission,
  numberWithCommasWithoutSymbol,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import WarningIcon from "@material-ui/icons/Warning";
import ErrorHandler from "Components/ErrorHandler";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";
import StaffSalaryDetail from "Containers/Payroll/Components/StaffSalaryDetail";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddSalaryPayment extends Component {
  constructor(props) {
    super(props);
    let {
      year,
      id,
      salaryIsPaid,
      yearName,
      salaryMonth,
      salaryMonthName,
      month,
    } = this.props.location.state;
    this.state = {
      staffDetails: [],
      salaryIsPaid: salaryIsPaid,
      year: year,
      yearName: yearName,
      salaryMonth: salaryMonth,
      salaryMonthName: salaryMonthName,
      month: month,
      staff_id: id,
      salaryDetails: {},
      errorMessage: "",
      open: false,
      salaryComponentList: [],
      loading: true,
      alertData: "",
      error: false,
      submitDisable: false,
      isDetailedReport: false,
      submitPermission: isUserHasPermission("payroll_salarypayment", "create"),
      salaryDetailedReport: {},
    };
  }

  componentDidMount() {
    this.getStaffDetails();
  }

  getStaffDetails = () => {
    const { staff_id } = this.state;
    const url = GET_URL.staffalldetail.api + staff_id + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            staffDetails: response.data.data,
          },
          () => {
            this.getSalaryPlan();
          }
        );
      }
    });
  };

  getSalaryPlan = () => {
    const { year, staff_id, salaryMonth } = this.state;
    let url = GET_URL.salaryemployeeplan.api;
    const params = {
      staff: staff_id,
      financial_year: year,
      salary_month: salaryMonth,
    };
    getRequest(url, params, { return_error: true }).then((response) => {
      if (response) {
        if (response.status === 200) {
          let salaryDetails = response.data.data[staff_id];
          this.setState({
            salaryDetails,
            salaryDetailedReport: response.data,
          });
        } else if (response.status === 400 && response.data) {
          if (response.data) {
            this.setState({ error: true, errorMessage: response.data });
          }
        } else {
          const error = { response };
          ErrorHandler(error);
        }
        this.setState({ loading: false });
      }
    });
  };

  viewPage = () => {
    let { salaryMonth, salaryMonthName, month } = this.state;
    let params = {
      salaryMonth: salaryMonth,
      salaryMonthName: salaryMonthName,
      month: month,
    };
    let searchParam = "?" + new URLSearchParams(params).toString();
    this.props.history.push({
      pathname: Actions.payroll_salarypayment.view.url,
      search: searchParam,
    });
  };

  saveData = () => {
    let { staff_id, salaryDetails, salaryMonth } = this.state;
    let salary_plan = [...salaryDetails.earnings, ...salaryDetails.deductions];
    let post_data = {
      staff: staff_id,
      salary_month: salaryMonth,
      salary_plan: salary_plan,
    };
    this.setState({ submitDisable: true });
    postRequestOnConfirm(
      POST_URL.salaryemployeemonthplan.api,
      post_data,
      this.props,
      "PaySalary"
    ).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.viewPage();
      }
      this.setState({ submitDisable: false });
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleOpenDetailed = () => {
    this.setState({
      isDetailedReport: !this.state.isDetailedReport,
    });
  };

  render() {
    const {
      staffDetails,
      salaryDetails,
      submitDisable,
      loading,
      alertData,
      submitPermission,
      open,
      error,
      salaryIsPaid,
      errorMessage,
      salaryMonthName,
      isDetailedReport,
      salaryDetailedReport,
      staff_id,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                <FormattedMessage {...messages.salaryPayment} />
              </Box>
            </Grid>

            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                <Button
                  variant="contained"
                  onClick={() => this.viewPage()}
                  className="editbutton-view"
                >
                  <VisibilityOutlined className="visibility-icon" />
                  <FormattedMessage {...messages.salaryPayment} />
                </Button>
              </Box>
            </Grid>

            <Box className="year-std-box mr-40">
              <Box className="academic-std-head ">Salary Month</Box>
              <Box className="aca-std-white-background">{salaryMonthName}</Box>
            </Box>
          </Grid>
          <Box>
            {error && (
              <Box
                display="flex"
                justifyContent="flex-end"
                className="waring-margin"
              >
                <Box
                  display="flex"
                  className="warning-message-salary warning-width"
                >
                  <WarningIcon className="warning-text" /> {errorMessage}
                </Box>
              </Box>
            )}
          </Box>
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12} className={classNames("header-align")}>
              <Box>
                <Box className="flex-prop">
                  <Box>
                    <Button
                      className="custom-button"
                      onClick={this.handleOpenDetailed}
                    >
                      Click For Detailed Report
                    </Button>
                    <SalaryProfileView details={staffDetails} />
                  </Box>
                  <Box>
                    {!error && (
                      <>
                        <Box>
                          <Box className="salary-plan-earning-view-sub-heading">
                            <FormattedMessage {...messages.earnings} />
                          </Box>
                          <TableContainer>
                            <Table
                              size="small"
                              aria-label="simple table"
                              className="salary-plan-row-margin"
                            >
                              <TableHead>
                                <TableRow className="salary-plan-table-header">
                                  <TableCell className="salary-plan-header-label">
                                    <FormattedMessage
                                      {...messages.componentName}
                                    />
                                  </TableCell>
                                  <TableCell className="salary-plan-header-label">
                                    <FormattedMessage
                                      {...commonMessages.amount}
                                    />
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {salaryDetails?.earnings?.length > 0 &&
                                  salaryDetails.earnings.map((data, index) => {
                                    return (
                                      <TableRow
                                        key={index}
                                        className="salary-plan-table-data-row"
                                      >
                                        <TableCell
                                          className="salary-plan-header-left"
                                          component="th"
                                          scope="row"
                                        >
                                          {data.salary_component_name}
                                        </TableCell>
                                        <TableCell
                                          className="salary-plan-header-value"
                                          component="th"
                                          scope="row"
                                        >
                                          {numberWithCommasWithoutSymbol(
                                            data.amount
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                <TableRow className="salary-plan-total-table-data-row">
                                  <TableCell
                                    className="salary-plan-header-left"
                                    component="th"
                                    scope="row"
                                  >
                                    <FormattedMessage
                                      {...messages.grossEarnings}
                                    />
                                  </TableCell>
                                  <TableCell
                                    className="salary-plan-amount"
                                    component="th"
                                    scope="row"
                                  >
                                    {numberWithCommasWithoutSymbol(
                                      salaryDetails?.gross_earnings
                                    )}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                        <Box>
                          <Box className="salary-plan-deduction-view-sub-heading">
                            <FormattedMessage {...messages.deductions} />
                          </Box>
                          <TableContainer>
                            <Table
                              size="small"
                              aria-label="simple table"
                              className="salary-plan-row-margin"
                            >
                              <TableHead>
                                <TableRow className="salary-plan-table-header">
                                  <TableCell className="salary-plan-header-label">
                                    <FormattedMessage
                                      {...messages.componentName}
                                    />
                                  </TableCell>
                                  <TableCell className="salary-plan-header-label">
                                    <FormattedMessage
                                      {...commonMessages.amount}
                                    />
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {salaryDetails?.deductions?.length > 0 &&
                                  salaryDetails.deductions.map(
                                    (data, index) => {
                                      return (
                                        <TableRow
                                          key={index}
                                          className="salary-plan-table-data-row"
                                        >
                                          <TableCell
                                            className="salary-plan-header-left"
                                            component="th"
                                            scope="row"
                                          >
                                            {data.salary_component_name}
                                          </TableCell>
                                          <TableCell
                                            className="salary-plan-header-value"
                                            component="th"
                                            scope="row"
                                          >
                                            {numberWithCommasWithoutSymbol(
                                              data.amount
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }
                                  )}
                                <TableRow className="salary-plan-total-table-data-row">
                                  <TableCell
                                    className="salary-plan-header-left"
                                    component="th"
                                    scope="row"
                                  >
                                    <FormattedMessage
                                      {...messages.grossDeductions}
                                    />
                                  </TableCell>
                                  <TableCell
                                    className="salary-plan-amount"
                                    component="th"
                                    scope="row"
                                  >
                                    {numberWithCommasWithoutSymbol(
                                      salaryDetails?.gross_deductions
                                    )}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                        <Box>
                          <Box className="salary-plan-deduction-view-sub-heading">
                            <FormattedMessage {...commonMessages.total} />
                          </Box>
                          <TableContainer>
                            <Table
                              size="small"
                              aria-label="simple table"
                              className="salary-plan-row-margin"
                            >
                              <TableHead>
                                <TableRow className="salary-plan-table-header">
                                  <TableCell className="salary-plan-header-label">
                                    <FormattedMessage
                                      {...messages.componentName}
                                    />
                                  </TableCell>
                                  <TableCell className="salary-plan-header-label">
                                    <FormattedMessage
                                      {...commonMessages.amount}
                                    />
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                <TableRow className="salary-plan-total-table-data-row">
                                  <TableCell
                                    className="salary-plan-header-left"
                                    component="th"
                                    scope="row"
                                  >
                                    <FormattedMessage {...messages.netPay} />
                                  </TableCell>
                                  <TableCell
                                    className="salary-plan-amount"
                                    component="th"
                                    scope="row"
                                  >
                                    {numberWithCommasWithoutSymbol(
                                      salaryDetails?.net_pay
                                    )}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {!error && !salaryIsPaid && submitPermission && (
                <Box
                  display="flex"
                  justifyContent="flex-end"
                  marginTop="40px"
                  className="submit-button-padding"
                >
                  <Button
                    variant="contained"
                    className="submit"
                    disabled={submitDisable}
                    onClick={() => this.saveData()}
                  >
                    <FormattedMessage {...commonMessages.payNow} />
                  </Button>
                </Box>
              )}
              {isDetailedReport && (
                <StaffSalaryDetail
                  closeInParent={this.handleOpenDetailed}
                  salaryDetailedReport={salaryDetailedReport}
                  salaryMonthName={salaryMonthName}
                  details={staffDetails}
                  staff_id={staff_id}
                />
              )}
              <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                open={open}
                autoHideDuration={2000}
                onClose={this.handleClose}
              >
                <Alert onClose={this.handleClose} severity="error">
                  {alertData}
                </Alert>
              </Snackbar>
            </Grid>
          </Grid>
        </Paper>
      );
    }
  }
}

export default withRouter(AddSalaryPayment);
