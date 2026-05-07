import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import {
  Grid,
  Checkbox,
  Paper,
  Box,
  Button,
  Typography,
  Divider,
} from "@material-ui/core";
import { withStyles } from "@material-ui/core/styles";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import WarningIcon from "@material-ui/icons/Warning";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import PaymentModal from "Components/PaymentModalNew";
import StudentGridCard from "Components/ProfileGridCard";
import { SUCCESS_MSG_PROPS } from "Constants";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { printPDF, Alert, isUserHasPermission } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import { roundOffDecimal } from "Constants";

const Styles = (theme) => ({
  feeName: {
    color: "#4680FF",
    letterSpacing: "-0.05px",
    fontStyle: "normal",
    fontWeight: "500",
    fontSize: "25px",
    marginTop: "12px",
  },
  feeTerms: {
    marginTop: "6px",
    marginBottom: "6px",
    fontSize: "18px",
  },
});

class FeesCollection extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      totalAmount: 0,
      totalConcessionAppied: 0,
      yearList: [],
      standardList: [],
      standard: 0,
      sectionList: [],
      section: 0,
      studentList: [],
      student: 0,
      studentApiFetch: false,
      studentInfo: {},
      feePlan: [],
      paymentValue: "Cash",
      refNumber: "",
      chequeNumber: "",
      termsData: [],
      openPaymentModal: false,
      amountDetails: {},
      checkedAllFeesData: {},
      severity: "",
      snackbar: false,
      alertData: "",
      enabledActions: [],
    };
  }

  handleChange = (event) => {
    this.setState({ paymentValue: event.target.value });
  };

  async componentDidMount() {
    this.updatePermissions();
    if (this.props.location && this.props.location.state) {
      const { yearid, standardid } = this.props.location.state;
      this.getFeePlan(yearid, standardid);
    } else {
      this.props.history.push(Actions.fee_collection.view.url);
    }
  }
  updatePermissions = (name) => {
    const hasViewPermission = isUserHasPermission("general_student", "view");
    const hasEditPermission = isUserHasPermission(
      "general_student_list",
      "update"
    );
    const hasDeletePermission = isUserHasPermission(
      "general_student_list",
      "delete"
    );
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    }
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
    } else {
      this.setState({
        enabledActions: enabledActions,
      });
    }
  };
  getFeePlan = (yearid, standardid) => {
    const { studentid } = this.props.location.state;
    let params = {
      academic_year: yearid,
      standard: standardid,
      student: studentid,
    };
    getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
      let feePlan = [];
      if (response && response.status === 200) {
        feePlan = response.data.data.plans;
        this.setState({ feePlan }, () => this.getFeeCollectionData());
      } else {
        this.setState({
          loading: false,
          // notApproved: true
        });
      }
    });
  };

  getFeeCollectionData = () => {
    const { yearid, studentid } = this.props.location.state;
    const params = { academic_year: yearid, student: studentid };
    getRequest(GET_URL.feecollection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let collection = response.data.data.collection;
          let feePlan = [...this.state.feePlan];
          for (let plan_index in feePlan) {
            for (let std_fee_index in feePlan[plan_index].standard_fee) {
              let id = feePlan[plan_index].standard_fee[std_fee_index].id;
              let result = [];
              for (var col in collection) {
                result = collection[col].payment_detail.filter(
                  (data) => parseInt(data.fee_term) === parseInt(id)
                );
                if (result.length > 0) break;
              }
              if (result.length === 0) {
                feePlan[plan_index].standard_fee[std_fee_index].amount_paid = 0;
                feePlan[plan_index].standard_fee[std_fee_index].status = false;
              } else {
                feePlan[plan_index].standard_fee[std_fee_index].amount_paid =
                  result[0].amount_paid;
                feePlan[plan_index].standard_fee[std_fee_index].status = true;
              }
            }
          }
          this.setState({
            feePlan: feePlan,
            studentApiFetch: true,
            studentInfo: response.data.data.student,
            loading: false,
          });
        }
      }
    );
  };
  checkAllTermsSelected = (standard_fee) => {
    for (let term of standard_fee) {
      if (!term.amount_paid) {
        return false;
      }
    }
    return true;
  };
  onChangeTermValue = (index, fIndex, value, is_amount_paid) => {
    if (!is_amount_paid) {
      let data = this.state.feePlan;
      data[index].standard_fee[fIndex].amount_paid = value;
      this.computeTotalAmount(data);
      let allTermSelected = this.checkAllTermsSelected(
        data[index].standard_fee
      );
      let checkedAllFeesData = { ...this.state.checkedAllFeesData };
      checkedAllFeesData[index] = allTermSelected;
      this.setState({
        feePlan: data,
        checkedAllFeesData,
      });
    } else {
      let data = this.state.feePlan;
      data[index].standard_fee[fIndex].amount_paid = 0;
      this.computeTotalAmount(data);
      let checkedAllFeesData = { ...this.state.checkedAllFeesData };
      checkedAllFeesData[index] = false;
      this.setState({
        feePlan: data,
        checkedAllFeesData,
      });
    }
  };

  checkAllTheValues = (index, is_checked) => {
    let feePlan = [...this.state.feePlan];
    let checkedAllFeesData = { ...this.state.checkedAllFeesData };
    checkedAllFeesData[index] = !is_checked;
    feePlan.forEach((data, ind) => {
      if (index === ind) {
        data.standard_fee.forEach((std_data) => {
          if (!std_data.status && is_checked) {
            std_data.amount_paid = 0;
          } else if (!std_data.status && !is_checked) {
            std_data.amount_paid = std_data.amount;
          }
        });
      }
    });
    this.computeTotalAmount(feePlan);
    this.setState({ feePlan, checkedAllFeesData });
  };

  computeTotalAmount = (data) => {
    let totalAmount = 0;
    let totalConcessionAppied = 0;
    let termsData = [];
    data.forEach((element) => {
      let feeData = {};
      element.standard_fee.forEach((temp) => {
        if (
          temp.status === false &&
          temp.amount_paid !== "" &&
          temp.amount_paid !== 0 &&
          temp.amount_paid !== 0
        ) {
          totalAmount += temp.amount_paid;
          totalConcessionAppied += temp.concession_amount
            ? temp.concession_amount
            : 0;
          if (!Object.keys(feeData).includes(element["fee_type_name"])) {
            feeData[element["fee_type_name"]] = [];
          }
          feeData[element["fee_type_name"]].push(temp);
        }
      });
      if (Object.keys(feeData).length > 0) {
        termsData.push(feeData);
      }
    });
    this.setState({
      totalAmount: Math.round(totalAmount),
      totalConcessionAppied,
      termsData,
    });
  };

  closeFeePaymentModal = () => {
    this.setState({ openPaymentModal: false });
  };

  validatePayingFees = () => {
    const { feePlan } = this.state;
    for (let plan_index in feePlan) {
      if (
        feePlan[plan_index].fee_type_name === "Admission fee" &&
        feePlan[plan_index].standard_fee.length > 1
      ) {
        for (let fee_index in feePlan[plan_index].standard_fee) {
          if (feePlan[plan_index].standard_fee[fee_index].terms === "Term1") {
            let amount_paid =
              feePlan[plan_index].standard_fee[fee_index].amount_paid;
            let amount = feePlan[plan_index].standard_fee[fee_index].amount;
            if (amount_paid !== amount) {
              this.setState({
                alertData: `Term1 Admission Fees is Mandatory to Pay`,
                snackbar: true,
                severity: "error",
              });
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  collectFees = async () => {
    if (!this.validatePayingFees()) {
      return;
    }
    const amountDetails = {
      student: this.state.studentInfo.name,
      amount: this.state.totalAmount,
    };
    this.setState({ openPaymentModal: true, amountDetails });
  };

  payFees = (fieldValues) => {
    const refNumber = fieldValues.refNo;
    const { paymentValue } = fieldValues;
    const { feePlan } = this.state;
    const { studentid, yearid } = this.props.location.state;
    let payment_ref_num = "";
    let error = false;
    if (paymentValue === "Online") {
      if (refNumber === "") {
        this.setState({
          alertData: `Please Fill RefNumber`,
          snackbar: true,
          severity: "error",
        });
        error = true;
      }
      payment_ref_num = refNumber;
    } else if (paymentValue === "Cheque") {
      if (refNumber === "") {
        error = true;
        this.setState({
          alertData: `Please enter ChequeNumner`,
          snackbar: true,
          severity: "error",
        });
      }
      payment_ref_num = refNumber;
    }
    if (!error) {
      let payload = {
        academic_year: yearid,
        student: studentid,
        mode_of_payment: paymentValue,
        payment_ref_num: payment_ref_num,
        admission_num: `${yearid}_${studentid}`,
        standard_fee: [],
      };
      for (let plan_index in feePlan) {
        for (let fee_index in feePlan[plan_index].standard_fee) {
          let id = feePlan[plan_index].standard_fee[fee_index].id;
          let status = feePlan[plan_index].standard_fee[fee_index].status;
          let amount_paid =
            feePlan[plan_index].standard_fee[fee_index].amount_paid;
          if (status === false && amount_paid !== 0) {
            payload.standard_fee.push({
              fee_plan: id,
            });
          }
        }
      }

      let url = POST_URL.feecollection.api;
      postRequest(url, payload, this.props).then((response) => {
        if (response && response.status === 200) {
          let props = { ...this.props };
          props.title = `Fees paid!!`;
          props.url = GET_URL.feecollection.api + response.data.data.id + "/";
          printPDF(props);
          this.props.history.push(Actions.fee_collection.view.url);
        }
        this.closeFeePaymentModal();
      });
    }
  };

  onChangeAutoComplete = (value, name) => {
    this.setState({
      student: value.id,
    });
  };

  clearData = () => {
    let feePlan = [...this.state.feePlan];
    let checkedAllFeesData = { ...this.state.checkedAllFeesData };
    Object.keys(checkedAllFeesData).forEach((key) => {
      checkedAllFeesData[key] = false;
    });
    feePlan.forEach(function (data, index) {
      data.standard_fee.forEach((fees, ind) => {
        if (!fees.status) {
          fees.amount_paid = 0;
        }
      });
    });
    this.setState({
      feePlan,
      totalAmount: 0,
      totalConcessionAppied: 0,
      termsData: [],
      checkedAllFeesData,
    });
  };

  deleteStudent = async (id, index) => {
    this.setState({ tableUpdating: true });
    const del_url = DEL_URL.application.api;
    const data = { data: [id] };
    const url = del_url + id + "/";
    deleteRequest(url, data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          ...SUCCESS_MSG_PROPS,
          title: response.data.Reason,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  handleClose = () => {
    this.setState({
      snackbar: false,
    });
  };

  render() {
    const { classes } = this.props;
    const {
      notApproved,
      loading,
      checkedAllFeesData,
      termsData,
      studentApiFetch,
      feePlan,
      totalAmount,
      totalConcessionAppied,
      studentInfo,
      snackbar,
      alertData,
    } = this.state;
    if (notApproved) {
      return (
        <BlankPagewithIcon
          data="Fee plan is not approved"
          heights="300px"
          icon={false}
        />
      );
    }

    if (loading) {
      return <LoadingGif />;
    }
    return (
      <Paper className="background">
        <Grid item container>
          <Grid item md={6} xs={12} className={"header-align"}>
            <Box className="heading" px={3}>
              Fees Collection
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className="header-align end-flex-prop">
              <Button
                variant="contained"
                component={Link}
                to={Actions.fee_collection.view.url}
                className="editbutton-view"
              >
                <VisibilityOutlinedIcon className="visibility-icon" /> View
                Student List
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box px={3}>
          <Box className="fee-collection-body width-100-perc">
            <Box className="studentcard-outer-section">
              {studentInfo && (
                <Box className="student-card-box">
                  <StudentGridCard
                    list={[studentInfo]}
                    delete={this.deleteStudent}
                    name="Application"
                    editURL={Actions.application_student_list.update.url}
                    viewURL={Actions.application_student.view.url}
                    enabledActions={this.state.enabledActions}
                  />
                </Box>
              )}
            </Box>
            <Box className="terms-invoice-view">
              <Box className="white-background-shadow " mt={2}>
                <Box className="md-down-flex-column flex-justify-space-between">
                  <Box className="width-60 fee-details-sec">
                    {feePlan.map((data, index) => {
                      let testNumberofpaid = 0;
                      let is_checked = false;
                      if (
                        Object.keys(checkedAllFeesData).includes(
                          index.toString()
                        ) &&
                        checkedAllFeesData[index]
                      ) {
                        is_checked = true;
                      }
                      if (data.reason) {
                        return (
                          <Box display="flex" className="warning-message">
                            <WarningIcon style={{ color: "#f6c342" }} />
                            {data.reason}
                          </Box>
                        );
                      } else {
                        return (
                          <Box
                            pl={3}
                            pb={4}
                            pt={2}
                            display="block"
                            key={index}
                            className="background-white"
                          >
                            <Grid container>
                              <Grid item xs={12}>
                                <Typography variant="h5">
                                  <Box className="fee-tye-head">
                                    {data.fee_type_name} : {data.amount}
                                  </Box>
                                </Typography>
                                <Box mt={3}>
                                  <Grid container>
                                    <Grid item md={10} xs={12}>
                                      {data.concession_amount && (
                                        <Box
                                          mb={2}
                                          className="flex-justify-space-between fee-concession-info"
                                        >
                                          <Box className="display-flex">
                                            <Box px={1}>
                                              Fee Without Concession:
                                            </Box>
                                            <Box px={1}>
                                              {data.standard_fee_amount}
                                            </Box>
                                          </Box>
                                          <Box className="display-flex">
                                            <Box px={1}>Concession Amount:</Box>
                                            <Box pl={1} pr={2}>
                                              {data.concession_amount}
                                            </Box>
                                          </Box>
                                        </Box>
                                      )}
                                    </Grid>
                                    <Grid
                                      item
                                      md={10}
                                      xs={12}
                                      className="fee-head"
                                    >
                                      <Grid container spacing={5}>
                                        <Grid item md={4} xs={4}>
                                          <Typography variant="h6">
                                            Terms
                                          </Typography>
                                        </Grid>
                                        <Grid item md={4} xs={4}>
                                          <Typography variant="h6">
                                            Amount
                                          </Typography>
                                        </Grid>
                                        <Grid item md={4} xs={4}>
                                          <Box>
                                            <Checkbox
                                              onChange={(e) =>
                                                this.checkAllTheValues(
                                                  index,
                                                  is_checked
                                                )
                                              }
                                              color="primary"
                                              checked={is_checked}
                                              inputProps={{
                                                "aria-label":
                                                  "primary checkbox",
                                              }}
                                            />
                                          </Box>
                                        </Grid>
                                      </Grid>
                                    </Grid>
                                  </Grid>
                                </Box>

                                {data.standard_fee.map((temp, fIndex) => {
                                  const is_amount_paid =
                                    temp.amount_paid === 0 ||
                                    temp.amount_paid === ""
                                      ? false
                                      : true;
                                  if (!temp.status) {
                                    testNumberofpaid = testNumberofpaid + 1;
                                  }
                                  return (
                                    <Box key={index + "" + temp.terms}>
                                      <Grid container>
                                        <Grid item md={10} xs={12}>
                                          <Grid container spacing={5}>
                                            <Grid item md={4} xs={4}>
                                              <Box
                                                pt={2}
                                                className="term-amount-sec"
                                              >
                                                {temp.terms}
                                              </Box>
                                            </Grid>
                                            <Grid item md={4} xs={4}>
                                              <Box
                                                pt={2}
                                                className="term-amount-sec"
                                              >
                                                {temp.amount.toFixed(
                                                  roundOffDecimal
                                                )}
                                              </Box>
                                            </Grid>
                                            <Grid item md={4} xs={4}>
                                              {studentApiFetch &&
                                                studentInfo && (
                                                  <Box component="span" pt={2}>
                                                    {!temp.status ? (
                                                      <Box>
                                                        {/* {testNumberofpaid === 1 && */}
                                                        <Checkbox
                                                          onChange={(e) =>
                                                            this.onChangeTermValue(
                                                              index,
                                                              fIndex,
                                                              temp.amount,
                                                              is_amount_paid
                                                            )
                                                          }
                                                          color="primary"
                                                          checked={
                                                            is_amount_paid
                                                          }
                                                          inputProps={{
                                                            "aria-label":
                                                              "primary checkbox",
                                                          }}
                                                        />
                                                        {/* } */}
                                                      </Box>
                                                    ) : (
                                                      <Box>
                                                        <Checkbox
                                                          checked={true}
                                                          disabled
                                                          color="primary"
                                                          value={
                                                            temp.amount_paid
                                                          }
                                                          inputProps={{
                                                            "aria-label":
                                                              "primary checkbox",
                                                          }}
                                                        />
                                                        <Box
                                                          component={"span"}
                                                          bgcolor="text.disabled"
                                                          color="background.paper"
                                                          borderRadius={3}
                                                          pl={2}
                                                          pr={2}
                                                          pt={0.5}
                                                          pb={0.5}
                                                          boxShadow={1}
                                                        >
                                                          Paid
                                                        </Box>
                                                      </Box>
                                                    )}
                                                  </Box>
                                                )}
                                            </Grid>
                                          </Grid>
                                        </Grid>
                                      </Grid>
                                    </Box>
                                  );
                                })}
                              </Grid>
                            </Grid>
                          </Box>
                        );
                      }
                    })}
                  </Box>
                  <Box className="width-40 pay-fee-det">
                    {termsData.length > 0 && (
                      <Box pr={5}>
                        <Box component="h1" style={{ textAlign: "center" }}>
                          INVOICE
                        </Box>
                        <Divider />
                        {termsData.map((fees, index) => {
                          let feeName = Object.keys(fees);
                          let feeValues = fees[feeName];
                          if (feeValues.length > 0) {
                            return (
                              <Box key={index}>
                                <Box className={classes.feeName}>{feeName}</Box>
                                {feeValues.map((terms, ind) => {
                                  return (
                                    <Grid
                                      container
                                      key={ind}
                                      className={classes.feeTerms}
                                    >
                                      <Grid item xs={6} md={6}>
                                        {terms.terms}
                                      </Grid>
                                      <Grid
                                        item
                                        xs={6}
                                        md={6}
                                        style={{ textAlign: "center" }}
                                      >
                                        {terms.amount_paid.toFixed(
                                          roundOffDecimal
                                        )}
                                      </Grid>
                                    </Grid>
                                  );
                                })}
                              </Box>
                            );
                          }
                          return "";
                        })}
                        <Grid
                          container
                          direction="row"
                          justify="center"
                          alignItems="center"
                        >
                          <Grid item md={12} xs={12}>
                            <Box mt={3}></Box>
                            <Box
                              mt={1}
                              className="flex-justify-center-flex-prop"
                            >
                              <Typography variant="h6">
                                Standard Fee :
                                {totalAmount + totalConcessionAppied}
                              </Typography>
                            </Box>
                            <Box
                              mt={1}
                              className="flex-justify-center-flex-prop"
                            >
                              <Typography variant="h6">
                                Concession Amount : {totalConcessionAppied}
                              </Typography>
                            </Box>
                            <Box
                              mt={1}
                              className="flex-justify-center-flex-prop"
                            >
                              <Typography variant="h6">
                                Total Amount : {totalAmount}
                              </Typography>
                            </Box>
                            <Box mt={4}>
                              <Box>
                                <Box
                                  style={{ background: "#f5faff" }}
                                  className="justify-space-even"
                                  p={3}
                                  borderRadius={18}
                                >
                                  <Button
                                    variant="contained"
                                    className="clear"
                                    onClick={() => this.clearData()}
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    variant="contained"
                                    className="submit"
                                    onClick={this.collectFees}
                                  >
                                    Submit
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={10000}
          onClose={this.handleClose}
        >
          <Alert onClose={this.handleClose} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
        {this.state.openPaymentModal && (
          <PaymentModal
            amountDetails={this.state.amountDetails}
            closeFeePaymentModal={() => this.closeFeePaymentModal()}
            payFees={this.payFees}
          />
        )}
      </Paper>
    );
  }
}

export default withRouter(withStyles(Styles)(FeesCollection));
