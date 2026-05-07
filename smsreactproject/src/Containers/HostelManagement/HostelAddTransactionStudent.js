import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  TextareaAutosize,
  TextField,
  FormControl,
  FormHelperText,
  CircularProgress,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import { amountRegexWithDecimals } from "Constants/regularExpression";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import {
  getUrlParam,
  Alert,
  isUserHasPermission,
  NumberFormatCustom,
  dateFormat,
} from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import HostelSelectedStudents from "./HostelSelectedStudents";

class HostelAddTransactionStudent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      transaction: { comment: "", type: "Distribute" },
      fieldErrors: {},
      financeTypeList: [],
      helperText: {},
      imagesPreview: [],
      imageUploading: false,
      largeImagePreview: "",
      loading: true,
      maximumAmount: "",
      enableUploadIcons: true,
      isEnable: {},
      upload_name: "Upload Receipt",
      openError: false,
      alertData: "Clear the errors",
      expenseDetails: {},
      isEdit: false,
      submitDisable: false,
      pageLoading: false,
      isBlankPage: false,
      bankInformation: {},
      staffList: [],
      finalStudentList: [],
      lowBalanceStudentList: [],
    };
    this.selectStudentRef = React.createRef();
  }

  componentDidMount = () => {
    let { selectedBuilding, building_name } = getUrlParam();
    this.setState({
      selectedBuilding,
      building_name,
      loading: false,
      transaction_id: Date.now(),
    });
  };

  handleSearchChange = (e) => {
    let { transaction, fieldErrors, isEnable } = this.state;
    let { name, value } = e.target;
    if (name === "amount") {
      isEnable["amountTax"] = true;
    }
    transaction[name] = value;
    delete fieldErrors[name];
    if (
      name === "amount" &&
      !amountRegexWithDecimals.value.test(value) &&
      value
    ) {
      fieldErrors[name] = amountRegexWithDecimals.errorText;
      this.setState({
        fieldErrors,
        transaction,
      });
      return;
    }
    isEnable[name] = true;
    this.validateAmount();
    this.setState(
      {
        transaction,
        isEnable,
        fieldErrors,
      },
      () => {
        if (name === "amount") {
          this.handleValidation();
        }
      }
    );
  };

  validateAmount = () => {
    let { fieldErrors, transaction, bankInformation } = this.state;
    let error = false;
    if (
      parseFloat(bankInformation.balance) < parseFloat(transaction.amount) &&
      transaction.type === "Distribute"
    ) {
      error = true;
      fieldErrors["amount"] = `Enter below amount ${bankInformation.balance}`;
    }
    if (parseFloat(transaction.amount) === 0) {
      error = true;
      fieldErrors["amount"] = "Amount should be grater than 0";
    }
    this.setState({
      fieldErrors,
      error,
    });
  };

  validation = () => {
    let returnValue = true;
    let {
      transaction,
      finalStudentList,
      fieldErrors,
      alertData,
      lowBalanceStudentList,
    } = this.state;
    if (!transaction.amount) {
      fieldErrors["amount"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnValue = false;
      alertData = "Clear error(s)";
    } else if (parseFloat(transaction.amount) < 1) {
      fieldErrors["amount"] = "Amount should be grater than 0";
      returnValue = false;
      alertData = "Clear error(s)";
    }
    if (finalStudentList.length === 0) {
      alertData = "Select student(s)";
      returnValue = false;
    }
    if (lowBalanceStudentList.length > 0) {
      alertData = "Remove low balance student(s)";
      returnValue = false;
    }
    this.setState({
      fieldErrors,
      openError: !returnValue,
      alertData,
    });
    return returnValue;
  };

  submit = () => {
    let { transaction, finalStudentIds, transaction_id } = this.state;
    let validate = this.validation();
    if (validate) {
      this.setState({ submitDisable: true });
      let post_data = {
        amount: parseFloat(transaction.amount),
        description: transaction.comment,
        student_list: finalStudentIds,
        transaction_id: transaction_id,
      };
      let url = POST_URL.withdraw.api;
      if (transaction.type === "Collect") {
        url = POST_URL.deposit.api;
      }
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.handleViewButton();
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleClose = () => {
    this.setState({
      openError: false,
      alertImageData: "",
    });
  };

  changeToggle = (event, value) => {
    let { transaction, fieldErrors } = this.state;
    if (value !== null) {
      delete fieldErrors["amount"];
      delete fieldErrors["comment"];
      transaction.type = value;
      transaction.amount = "";
      this.setState(
        {
          transaction,
          fieldErrors,
        },
        () => {
          this.handleValidation();
          this.validateAmount();
        }
      );
    }
  };

  handleValidation = () => {
    this.setState({
      neededSort: true,
    });
  };

  updateFinalStudents = (list, finalStudentIds) => {
    let finalStudentList = [];
    finalStudentList = list;
    this.setState(
      {
        finalStudentList,
        finalStudentIds,
      },
      () => {
        this.handleValidation();
      }
    );
  };

  handleUpdatedSortedist = (lowBalanceStudentList) => {
    this.setState({ neededSort: false, lowBalanceStudentList });
  };

  handleViewButton = () => {
    const { selectedBuilding, building_name } = this.state;

    let searchState = {
      selectedBuilding: selectedBuilding,
      building_name: building_name,
    };

    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.hostel_student_transaction_list.view.url,
      search: searchParam,
    });
  };

  render() {
    const {
      loading,
      transaction,
      fieldErrors,
      finalStudentList,
      enableUploadIcons,
      lowBalanceStudentList,
      openError,
      alertData,
      submitDisable,
      pageLoading,
      isBlankPage,
      building_name,
      selectedBuilding,
      neededSort,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <div>
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">Create Student Transaction</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("sections", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleViewButton}
                      // component={Link} to={Actions.hostel_student_transaction_list.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.hostel_student_transaction_list.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="year-std-box mr-40">
              <Box className="academic-std-head "> Building Name</Box>
              <Box className=" aca-std-white-background">{building_name}</Box>
            </Box>
            {isBlankPage && !pageLoading && (
              <Grid item md={12} className="header-align">
                <BlankPagewithIcon data="Select Finance Type" />
              </Grid>
            )}
            {pageLoading && (
              <Box className="loading">
                <CircularProgress />
              </Box>
            )}
            {/* {!pageLoading && !isBlankPage && */}
            <Box className="mt-30">
              <Grid container spacing={1}>
                <Grid item md={8} xs={12}>
                  <Paper className="p-10">
                    <HostelSelectedStudents
                      updateFinalStudents={this.updateFinalStudents}
                      neededSort={neededSort}
                      updatedSortSuccess={this.handleUpdatedSortedist}
                      amount={transaction.amount}
                      transaction_type={transaction.type}
                      selectedBuilding={selectedBuilding}
                    />
                  </Paper>
                </Grid>
                <Grid item md={4} xs={12}>
                  <Paper className="paper-plain-background header-align p-b-20px">
                    <Grid container spacing={2}>
                      <Grid item md={12} xs={12} style={{ marginTop: "10px" }}>
                        <ToggleButtonGroup
                          size="medium"
                          value={transaction.type}
                          exclusive
                          onChange={this.changeToggle}
                          style={{ backgroundColor: "white" }}
                        >
                          <ToggleButton
                            key={1}
                            value="Distribute"
                            className={
                              transaction.type == "Distribute"
                                ? "selected-transaction-type"
                                : "not-selected-transaction-type"
                            }
                          >
                            Withdraw
                          </ToggleButton>
                          <ToggleButton
                            key={2}
                            value="Collect"
                            className={
                              transaction.type == "Collect"
                                ? "selected-transaction-type"
                                : "not-selected-transaction-type"
                            }
                          >
                            Deposit
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Grid>
                      <Grid item md={12} xs={12}>
                        <TextField
                          label="Amount"
                          autoComplete="off"
                          required={true}
                          name="amount"
                          value={transaction.amount}
                          className="width-100"
                          InputProps={{
                            inputComponent: NumberFormatCustom,
                          }}
                          inputProps={{
                            maxLength: "15",
                            style: { textAlign: "right" },
                          }}
                          fullWidth={true}
                          variant="outlined"
                          helperText={
                            fieldErrors["amount"] ? fieldErrors["amount"] : ""
                          }
                          error={fieldErrors["amount"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                    </Grid>
                    <Grid container>
                      <Grid item md={12}>
                        <FormControl
                          fullWidth
                          error={
                            fieldErrors.comment &&
                            (fieldErrors.comment ? true : false)
                          }
                        >
                          <Box className="create-expenses-comment header-align">
                            Comment
                          </Box>
                          <TextareaAutosize
                            aria-label="minimum height"
                            className="create-expenses-comment-auto-size"
                            value={transaction.comment}
                            name="comment"
                            maxLength={200}
                            onChange={(e) => this.handleSearchChange(e)}
                          />
                          {fieldErrors.comment && (
                            <FormHelperText>
                              {fieldErrors.comment}
                            </FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                    </Grid>
                    <Box className="flex-justify-space-around  fs-15 font-weight-bold mt-10">
                      <Box className="text-green">{`Total Students- ${finalStudentList.length}`}</Box>
                      <Box className="text-red">{`Low Balance Students- ${lowBalanceStudentList.length}`}</Box>
                    </Box>
                    <Box
                      display="flex"
                      marginLeft="auto"
                      justifyContent="flex-end"
                      className="header-align"
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        className="submit"
                        disabled={submitDisable}
                        onClick={this.submit}
                      >
                        Submit &nbsp;{" "}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
            {/* } */}
          </Paper>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openError}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </div>
      );
    }
  }
}

export default withRouter(HostelAddTransactionStudent);
