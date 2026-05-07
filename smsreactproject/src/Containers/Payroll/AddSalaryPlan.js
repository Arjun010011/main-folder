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
  TextField,
  Tooltip,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlined from "@material-ui/icons/VisibilityOutlined";
import { postRequestOnConfirm } from "Includes/api/apicall";
import Swal from "sweetalert2";
import classNames from "classnames";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import SalaryProfileView from "Containers/Payroll/Components/SalaryProfileView";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import {
  isUserHasPermission,
  numberWithCommas,
  numberWithCommasWithoutSymbol,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Dropdown } from "Components/DropDown";
import { Actions } from "Constants/permissions";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import WarningIcon from "@material-ui/icons/Warning";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AddSalaryPlan extends Component {
  constructor(props) {
    super(props);
    let { year, id, salaryIsApproved, yearName } = this.props.location.state;
    this.state = {
      staffDetails: [],
      salaryIsApproved: salaryIsApproved,
      year: year,
      yearName: yearName,
      staff_id: id,
      salaryDetails: {},
      warningMessage: "",
      open: false,
      salaryComponentList: [],
      loading: true,
      alertData: "",
      warning: false,
      submitDisable: false,
      submitPermission: isUserHasPermission("payroll_salaryplan", "create"),
    };
  }

  componentDidMount() {
    this.getStaffDetails();
    this.getSalaryComponent();
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

  getSalaryComponent = async () => {
    await getRequest(
      GET_URL.salarycomponent.api,
      { is_active: true, formatted: 1 },
      this.props
    ).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          salaryComponentList: response.data.data,
        });
      }
    });
  };

  getSalaryPlan = () => {
    const { year, staff_id, salaryIsApproved } = this.state;
    let url = salaryIsApproved
      ? GET_URL.salaryemployeeplan.api
      : GET_URL.salaryplangenerate.api;
    const params = { staff: staff_id, financial_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let salaryDetails =
          response.data.data?.[staff_id] ?? response.data.data;
        this.setState(
          {
            salaryDetails,
            loading: false,
          },
          () => {
            this.getDifferenceAmount();
          }
        );
      }
    });
  };

  valdiateDuplicateEmpty = (component, name) => {
    let { salaryDetails } = this.state;
    let duplicateEmptyFound = false;
    for (let comp of component) {
      if (comp.salary_component === 0) {
        comp["error"] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        duplicateEmptyFound = true;
      } else {
        comp["error"] = "";
      }
    }
    salaryDetails[name] = [...component];
    this.setState({ ...salaryDetails });
    return duplicateEmptyFound;
  };

  onAddMore = (name) => {
    let { salaryDetails } = this.state;
    if (!this.valdiateDuplicateEmpty(salaryDetails[name], name)) {
      salaryDetails[name].push({ salary_component: 0, amount: 0 });
      this.setState({ ...salaryDetails });
    }
  };

  onComponentChange = (e, element, index) => {
    let { salaryDetails } = this.state;
    let { name, value } = e.target;
    if (value) {
      for (const comp of salaryDetails[name]) {
        if (comp["salary_component"] === value) {
          this.setState({
            open: true,
            salaryDetails,
            alertData: (
              <FormattedMessage {...commonMessages.duplicateFoundLabel} />
            ),
          });
          return;
        }
      }
      salaryDetails[name][index]["salary_component"] = value;
      salaryDetails[name][index]["salary_component_name"] =
        element.props.children;
      this.setState({
        salaryDetails,
      });
    }
  };

  onChange = (e, index) => {
    let { salaryDetails } = this.state;
    let { name, value } = e.target;
    if (value < 100000000) {
      let diffVal = salaryDetails[name][index]["amount"] - value;
      salaryDetails[`gross_${name}`] -= diffVal;
      salaryDetails["net_pay"] =
        salaryDetails["gross_earnings"] - salaryDetails["gross_deductions"];
      salaryDetails[name][index]["amount"] = value;
      this.setState(
        {
          salaryDetails,
        },
        () => {
          this.getDifferenceAmount();
        }
      );
    }
  };

  handleChangePlan = (e, index, fieldName) => {
    let salaryDetailsTemp = { ...this.state.salaryDetails };
    let { name } = e.target;
    salaryDetailsTemp[name][index][fieldName] =
      !salaryDetailsTemp[name][index][fieldName];
    this.setState({
      salaryDetails: { ...salaryDetailsTemp },
    });
  };

  onDelete = (index, name) => {
    let salaryDetails = { ...this.state.salaryDetails };
    let value = salaryDetails[name][index]["amount"];
    salaryDetails[`gross_${name}`] -= value;
    salaryDetails["net_pay"] =
      salaryDetails["gross_earnings"] - salaryDetails["gross_deductions"];
    salaryDetails[name].splice(index, 1);
    this.setState(
      {
        salaryDetails: { ...salaryDetails },
      },
      () => {
        // this.valdiateDuplicateEmpty(salaryDetails[name], name);
        this.getDifferenceAmount();
      }
    );
  };

  getDifferenceAmount = () => {
    let { salaryDetails, staffDetails, warningMessage, warning } = this.state;
    if (salaryDetails.gross_earnings <= salaryDetails.gross_deductions) {
      warning = true;
      warningMessage = "Gross Deductions should be lesser than Gross Earnings";
    } else if (parseInt(staffDetails.salary) !== salaryDetails.gross_earnings) {
      warning = true;
      let diffAmt =
        parseInt(staffDetails.salary) - salaryDetails.gross_earnings;
      warningMessage =
        "Gross Salary should match staff salary. Difference is " +
        numberWithCommas(diffAmt);
    } else {
      warning = false;
    }
    this.setState({
      warning: warning,
      warningMessage,
    });
  };

  saveData = () => {
    let { staff_id, salaryDetails, warning, year } = this.state;
    if (
      warning ||
      this.valdiateDuplicateEmpty(salaryDetails.earnings, "earnings") ||
      this.valdiateDuplicateEmpty(salaryDetails.deductions, "deductions")
    ) {
      this.setState({
        open: true,
        alertData: "Please resolve the warning/error.",
      });
    } else {
      let salary_plan = [
        ...salaryDetails.earnings,
        ...salaryDetails.deductions,
      ];
      for (const sal of salary_plan) {
        if (sal["amount"] == 0) {
          return this.setState({
            open: true,
            alertData: sal.salary_component_name + " should be greater than 0.",
          });
        }
        sal["is_approved"] = true;
      }
      let post_data = {
        staff: staff_id,
        financial_year: year,
        salary_plan: salary_plan,
      };
      this.setState({ submitDisable: true });
      postRequestOnConfirm(
        POST_URL.salaryemployeeplan.api,
        post_data,
        this.props,
        "Approve"
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
    }
  };

  viewPage = () => {
    this.props.history.push(Actions.payroll_salaryplan.view.url);
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  render() {
    const {
      staffDetails,
      salaryDetails,
      submitDisable,
      loading,
      alertData,
      salaryComponentList,
      open,
      warning,
      salaryIsApproved,
      warningMessage,
      submitPermission,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      let deductions = salaryDetails["deductions"]
        ? [...salaryDetails["deductions"]]
        : [];
      let earnings = salaryDetails["earnings"]
        ? [...salaryDetails["earnings"]]
        : [];
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                <FormattedMessage {...messages.salaryPlan} />
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
                  <FormattedMessage {...messages.salaryPlan} />
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12} className={classNames("header-align")}>
              <Box>
                <Box className="flex-prop">
                  <Box>
                    <SalaryProfileView details={staffDetails} />
                  </Box>
                  <Box>
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
                                <FormattedMessage {...messages.componentName} />
                              </TableCell>
                              <TableCell className="salary-plan-header-label">
                                <FormattedMessage {...commonMessages.amount} />
                              </TableCell>
                              {!salaryIsApproved && (
                                <TableCell className="salary-plan-header-label-right">
                                  <Tooltip
                                    title={
                                      <FormattedMessage
                                        {...commonMessages.addMore}
                                      />
                                    }
                                    placement="top-start"
                                    arrow
                                  >
                                    <AddCircleOutlineOutlinedIcon
                                      onClick={() => this.onAddMore("earnings")}
                                      className="visibility-icon"
                                    />
                                  </Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {earnings.length > 0 &&
                              earnings.map((data, index) => {
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
                                      {data.salary_component !== 0 &&
                                        data.salary_component_name}
                                      {!data.salary_component && (
                                        <Dropdown
                                          data={salaryComponentList.earnings}
                                          name="earnings"
                                          value={
                                            data.salary_component_name
                                              ? data.salary_component_name
                                              : ""
                                          }
                                          style="width-100"
                                          hideSelect={true}
                                          error={data.error}
                                          onChange={(e, element) =>
                                            this.onComponentChange(
                                              e,
                                              element,
                                              index
                                            )
                                          }
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className="salary-plan-header-value"
                                      component="th"
                                      scope="row"
                                    >
                                      {salaryIsApproved &&
                                        numberWithCommasWithoutSymbol(
                                          data.amount
                                        )}
                                      {!salaryIsApproved && (
                                        <TextField
                                          id="outlined-name"
                                          fullWidth
                                          InputProps={{
                                            inputProps: {
                                              max: 10000000000,
                                              min: 1,
                                              style: { textAlign: "right" },
                                            },
                                          }}
                                          value={parseInt(data.amount)}
                                          type="number"
                                          name="earnings"
                                          autoComplete="off"
                                          onChange={(e) =>
                                            this.onChange(e, index)
                                          }
                                        />
                                      )}
                                    </TableCell>
                                    {!salaryIsApproved && (
                                      <TableCell
                                        className="salary-plan-header-value"
                                        component="th"
                                        scope="row"
                                      >
                                        <Button
                                          color="secondary"
                                          className="min-max-w-0"
                                          onClick={() =>
                                            this.onDelete(index, "earnings")
                                          }
                                        >
                                          <DeleteOutlineIcon className="add-icon-stock-item" />
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                            <TableRow className="salary-plan-total-table-data-row">
                              <TableCell
                                className="salary-plan-header-left"
                                component="th"
                                scope="row"
                              >
                                <FormattedMessage {...messages.grossEarnings} />
                              </TableCell>
                              <TableCell
                                className="salary-plan-amount"
                                component="th"
                                scope="row"
                              >
                                {numberWithCommasWithoutSymbol(
                                  salaryDetails.gross_earnings
                                )}
                              </TableCell>
                              {!salaryIsApproved && (
                                <TableCell
                                  className="salary-plan-header-value"
                                  component="th"
                                  scope="row"
                                ></TableCell>
                              )}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    <Box>
                      {warning && (
                        <Box
                          display="flex"
                          justifyContent="flex-end"
                          className="waring-margin"
                        >
                          <Box
                            display="flex"
                            className="warning-message-salary warning-width"
                          >
                            <WarningIcon className="warning-text" />{" "}
                            {warningMessage}
                          </Box>
                        </Box>
                      )}
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
                                <FormattedMessage {...messages.componentName} />
                              </TableCell>
                              <TableCell className="salary-plan-header-label">
                                <FormattedMessage {...commonMessages.amount} />
                              </TableCell>
                              <TableCell className="salary-plan-header-label">
                                <FormattedMessage
                                  {...messages.fixedDeduction}
                                />
                              </TableCell>
                              {!salaryIsApproved && (
                                <TableCell className="salary-plan-header-label-right">
                                  <Tooltip
                                    title={
                                      <FormattedMessage
                                        {...commonMessages.addMore}
                                      />
                                    }
                                    placement="top-start"
                                    arrow
                                  >
                                    <AddCircleOutlineOutlinedIcon
                                      onClick={() =>
                                        this.onAddMore("deductions")
                                      }
                                      className="visibility-icon"
                                    />
                                  </Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {deductions.length > 0 &&
                              deductions.map((data, index) => {
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
                                      {data.salary_component !== 0 &&
                                        data.salary_component_name}
                                      {!data.salary_component && (
                                        <Dropdown
                                          data={salaryComponentList.deductions}
                                          name="deductions"
                                          value={
                                            data.salary_component_name
                                              ? data.salary_component_name
                                              : ""
                                          }
                                          style="width-100"
                                          hideSelect={true}
                                          error={data.error}
                                          onChange={(e, element) =>
                                            this.onComponentChange(
                                              e,
                                              element,
                                              index
                                            )
                                          }
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className="salary-plan-header-value"
                                      component="th"
                                      scope="row"
                                    >
                                      {salaryIsApproved &&
                                        numberWithCommasWithoutSymbol(
                                          data.amount
                                        )}
                                      {!salaryIsApproved && (
                                        <TextField
                                          id="outlined-name"
                                          InputProps={{
                                            inputProps: {
                                              max: 10000000000000,
                                              min: 1,
                                              style: { textAlign: "right" },
                                            },
                                          }}
                                          fullWidth
                                          value={parseInt(data.amount)}
                                          type="number"
                                          name="deductions"
                                          autoComplete="off"
                                          onChange={(e) =>
                                            this.onChange(e, index)
                                          }
                                        />
                                      )}
                                    </TableCell>
                                    {!salaryIsApproved && (
                                      <TableCell
                                        className="salary-plan-header-value"
                                        component="th"
                                        scope="row"
                                      >
                                        <FormControlLabel
                                          control={
                                            <Switch
                                              checked={data.is_fixed_deduction}
                                              name="deductions"
                                              value={data.is_fixed_deduction}
                                              color="primary"
                                              onChange={(e) =>
                                                this.handleChangePlan(
                                                  e,
                                                  index,
                                                  "is_fixed_deduction"
                                                )
                                              }
                                            />
                                          }
                                          label={
                                            <div className="text-blue">
                                              Is Yes
                                            </div>
                                          }
                                        />
                                      </TableCell>
                                    )}
                                    {!salaryIsApproved && (
                                      <TableCell
                                        className="salary-plan-header-value"
                                        component="th"
                                        scope="row"
                                      >
                                        <Button
                                          color="secondary"
                                          className="min-max-w-0"
                                          onClick={() =>
                                            this.onDelete(index, "deductions")
                                          }
                                        >
                                          <DeleteOutlineIcon className="add-icon-stock-item" />
                                        </Button>
                                      </TableCell>
                                    )}
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
                                  {...messages.grossDeductions}
                                />
                              </TableCell>
                              <TableCell
                                className="salary-plan-amount"
                                component="th"
                                scope="row"
                              >
                                {numberWithCommasWithoutSymbol(
                                  salaryDetails.gross_deductions
                                )}
                              </TableCell>
                              {!salaryIsApproved && (
                                <TableCell
                                  className="salary-plan-header-value"
                                  component="th"
                                  scope="row"
                                ></TableCell>
                              )}
                              <TableCell
                                className="salary-plan-header-value"
                                component="th"
                                scope="row"
                              ></TableCell>
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
                                <FormattedMessage {...messages.componentName} />
                              </TableCell>
                              <TableCell className="salary-plan-header-label">
                                <FormattedMessage {...commonMessages.amount} />
                              </TableCell>
                              {!salaryIsApproved && (
                                <TableCell className="salary-plan-header-label"></TableCell>
                              )}
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
                                className={
                                  "salary-plan-amount" +
                                  (salaryIsApproved ? "" : "-center")
                                }
                                component="th"
                                scope="row"
                              >
                                {numberWithCommasWithoutSymbol(
                                  salaryDetails.net_pay
                                )}
                              </TableCell>
                              {!salaryIsApproved && (
                                <TableCell
                                  className="salary-plan-header-value"
                                  component="th"
                                  scope="row"
                                ></TableCell>
                              )}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {!salaryIsApproved && submitPermission && (
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
                    Approve And Submit
                  </Button>
                </Box>
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

export default withRouter(AddSalaryPlan);
