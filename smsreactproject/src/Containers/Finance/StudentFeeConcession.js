import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import { Paper, Grid, Box, CircularProgress, Button } from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";

import LoadingGif from "Components/LoadingGif";
import { GET_URL, DEL_URL, POST_URL, PUT_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { Actions } from "Constants/permissions";
import { TRANSPORT_CODE, SUCCESS_MSG_PROPS } from "Constants";
import {
  getRequest,
  postRequest,
  putRequest,
  deleteRequest,
} from "Includes/api/apicall";
import {
  getUrlParam,
  Alert,
  getKeyValueMap,
  getPercentValue,
  getPercent,
  isUserHasPermission,
} from "Includes/functions";

class StudentFeeConcession extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: {},
      open: false,
      alertData: "",
      loading: true,
      loadingTable: false,
      submitDisable: false,
      concessionData: {},
      availableConcessions: [],
      submitting: false,
    };
  }

  componentDidMount() {
    this.getStudentFeeConcessionDetails();
  }

  getStudentFeeConcessionDetails = () => {
    this.setState({ loadingTable: true });
    let { year, standard, student } = getUrlParam();
    if (!year || !standard || !student) {
      this.props.history.push(Actions.student_fee_concession.view.url);
    }
    const url = `${GET_URL.concessionstudentlist.api}${student}/`;
    const params = { academic_year: year, standard };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const response_data = response.data.data;
        let appliedConcessionId = response_data.concession
          ? response_data.concession
          : null;
        this.setState({
          concessionData: response_data,
          appliedConcessionId,
          loading: false,
          loadingTable: false,
          year,
          standard,
          student,
        });
        this.getConcessionTypeList(appliedConcessionId);
        if (appliedConcessionId) {
          this.createStudentConcession(
            response_data.concession_list,
            "oldAppliedConcession"
          );
        }
      } else {
        this.setState({
          loading: false,
          loadingTable: false,
          year,
          standard,
          student,
        });
      }
    });
  };

  getConcessionTypeList = (appliedConcessionId) => {
    const { year, standard } = getUrlParam();
    let params = {
      academic_year: year,
      standard: standard,
      is_active: 1,
      approval_status: 1,
    };
    getRequest(GET_URL.concessionapprove.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const response_data = response.data.data;
          const unappliedConcessions = [];
          const approvedStandardConcession = response_data.map((concession) => {
            concession.name = concession.concession_type_name;
            if (concession.id !== appliedConcessionId) {
              unappliedConcessions.push(concession);
            }
          });
          this.setState({
            approvedStandardConcession,
            unappliedConcessions,
          });
        }
      }
    );
  };
  handleClose = () => {
    this.setState({ open: false });
  };

  submit = () => {
    const {
      student,
      applied_concession,
      appliedConcessionId,
      concessionData,
    } = this.state;
    const payload = {
      student: parseInt(student),
      concession: applied_concession,
    };
    if (appliedConcessionId) {
      const url = `${PUT_URL.concessionstudent.api}${concessionData.concession_student}/`;
      this.setState({ submitting: true });
      putRequest(url, payload, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            ...SUCCESS_MSG_PROPS,
            title: response.data.Reason,
          });
          this.props.history.push(Actions.student_fee_concession.view.url);
        }
      });
    } else {
      const url = POST_URL.concessionstudent.api;
      this.setState({ submitting: true });
      postRequest(url, payload, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState({ submitting: false }, () => {
            Swal.fire({
              ...SUCCESS_MSG_PROPS,
              title: response.data.Reason,
            });
            this.props.history.push(Actions.student_fee_concession.view.url);
          });
        }
      });
    }
  };

  deleteConcession = () => {
    const { appliedConcessionId, concessionData } = this.state;
    const url = `${DEL_URL.concessionstudent.api}${concessionData.concession_student}/`;
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({ submitting: false }, () => {
          Swal.fire({
            ...SUCCESS_MSG_PROPS,
            title: response.data.Reason,
          });
          this.props.history.push(Actions.student_fee_concession.view.url);
        });
      }
    });
  };

  createStudentConcession = (concessionList, type) => {
    const appliedConcession = [];
    let appliedConcessionType = "feetype";
    concessionList.map((concession) => {
      appliedConcessionType = concession.type;
      concession.fee_amount = concession.standard_fee_total_amount;
      let fee_amount = concession.standard_fee_total_amount;
      if (concession.type === "feetype") {
        concession.fee_amount =
          concession.standard_fee_codename === TRANSPORT_CODE
            ? `${concession.standard_fee_amount}%`
            : `₹ ${concession.standard_fee_amount}`;
        fee_amount = concession.standard_fee_amount;
      }
      if (concession.is_amount) {
        concession.concession_in_perc = `${getPercent(
          fee_amount,
          concession.rate
        ).toFixed(2)} %`;
        concession.concession_amount = `₹ ${concession.rate.toFixed(0)}`;
      } else {
        if (concession.standard_fee_codename === TRANSPORT_CODE) {
          concession.concession_amount = "-";
        } else {
          concession.concession_amount = `₹ ${getPercentValue(
            concession.rate,
            fee_amount
          ).toFixed(0)} `;
        }
        concession.concession_in_perc = `${concession.rate.toFixed(2)}%`;
      }
      appliedConcession.push(concession);
    });
    let concessionType = "appliedConcessionType";
    if (type === "oldAppliedConcession") {
      concessionType = "oldAppliedConcessionType";
    }
    this.setState({
      [type]: appliedConcession,
      [concessionType]: appliedConcessionType,
    });
  };

  setUpStudentConcession = () => {
    const {
      unappliedConcessions,
      applied_concession,
      standard,
      year,
    } = this.state;
    const url = `${GET_URL.concession.api}`;
    const concessionTypeMap = getKeyValueMap(
      unappliedConcessions,
      "id",
      "concession_type"
    );
    const params = {
      is_active: 1,
      standard: standard,
      academic_year: year,
      concession_type: concessionTypeMap[applied_concession],
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.createStudentConcession(response.data.data, "appliedConcession");
      }
    });
  };

  onChange = (e) => {
    const { value, name } = e.target;
    if(value === 0) {
      this.createStudentConcession([], "appliedConcession");
    } else {
      this.setState({ [name]: value }, () => this.setUpStudentConcession());
    }
  };

  render() {
    const {
      loadingTable,
      open,
      alertData,
      concessionData,
      submitting,
      loading,
      applied_concession,
      unappliedConcessions,
      appliedConcession,
      appliedConcessionType,
      appliedConcessionId,
      oldAppliedConcession,
      oldAppliedConcessionType,
    } = this.state;
    if (loading) return <LoadingGif />;
    return (
      <div>
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={8} xs={12} className="header-align">
              <Box className="heading">Apply Fee Concession</Box>
            </Grid>
            <Grid item md={4} xs={12} className="header-align">
              <Box className=" end-flex-prop">
                <Button
                  variant="contained"
                  component={Link}
                  to={Actions.student_fee_concession.view.url}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />
                  View Fee Concession List
                </Button>
              </Box>
            </Grid>
            <Grid item md={12} xs={12} className="sub-heading">
              <Box className={"year-std-info"}>
                {concessionData.academic_year_value && (
                  <Box className="plan-sub-head-det">
                    Academic Year:{" "}
                    <Box className="aca-std-white-background">
                      {concessionData.academic_year_value}
                    </Box>
                  </Box>
                )}
                {concessionData.standard_name && (
                  <Box className="std-det-plan plan-sub-head-det">
                    Standard:{" "}
                    <div className="aca-std-white-background">
                      {concessionData.standard_name}
                    </div>
                  </Box>
                )}
                {concessionData.section_name && (
                  <Box className="std-det-plan plan-sub-head-det">
                    Section:{" "}
                    <div className="aca-std-white-background">
                      {concessionData.section_name}
                    </div>
                  </Box>
                )}
                {concessionData.name && (
                  <Box
                    className={` plan-sub-head-det ${
                      concessionData.standard_name && "std-det-plan"
                    }`}
                  >
                    Student:{" "}
                    <div className="aca-std-white-background">
                      {concessionData.name}
                    </div>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item md={8} xs={12} className="heading">
              {unappliedConcessions && (
                <Dropdown
                  data={unappliedConcessions}
                  name={"applied_concession"}
                  value={applied_concession}
                  onChange={(e) => this.onChange(e)}
                  label="Concession Types"
                />
              )}
            </Grid>

            {loadingTable && (
              <Box className="loading">
                <CircularProgress />
              </Box>
            )}
            {appliedConcession && appliedConcession.length !== 0 && (
              <Grid item md={10} lg={10} xl={8}>
                <Box className={loadingTable && "display-none"}>
                  <Box className="students-concession-paper">
                    {appliedConcessionType === "feetype" ? (
                      <table width="100%" className="finance-custom-table ">
                        <thead>
                          <tr className="finance-table-custom-header">
                            <th>Fee Type</th>
                            <th>Fee Amount</th>
                            <th>Concession Percentage</th>
                            <th>Concession Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appliedConcession &&
                            appliedConcession.map((data, index) => {
                              return (
                                <tr key={index} className="text-dark-75">
                                  <td className="text-center table-data">
                                    {data.standard_fee_name}
                                  </td>
                                  <td className="text-center table-data">
                                    {data.fee_amount}
                                  </td>
                                  <td className="text-center table-data">
                                    {data.concession_in_perc}
                                  </td>
                                  <td className="text-center table-data">
                                    {data.concession_amount}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    ) : (
                      <>
                        <table width="100%" className="finance-custom-table">
                          <thead>
                            <tr className="finance-table-custom-header">
                              <th>Concession Percentage</th>
                              <th>Concession Amount</th>
                              <th>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appliedConcession &&
                              appliedConcession.map((data, index) => {
                                return (
                                  <tr key={index} className="text-dark-75">
                                    <td className="text-center table-data">
                                      {data.concession_in_perc}
                                    </td>
                                    <td className="text-center table-data">
                                      {data.concession_amount}
                                    </td>
                                    <td className="text-center table-data">
                                      ₹ {data.standard_fee_total_amount}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </>
                    )}
                  </Box>
                  <Box className=" end-flex-prop">
                    {applied_concession && appliedConcession && (
                      <Box>
                        <Button
                          className="submit margin-20"
                          variant="contained"
                          onClick={() => this.submit()}
                          disabled={submitting}
                        >
                          Submit
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>
            )}
            {oldAppliedConcession && oldAppliedConcession.length !== 0 && (
              <Grid item md={10} lg={10} xl={8}>
                <Box className={loadingTable && "display-none"}>
                  <Box className="students-concession-paper">
                    {appliedConcession && appliedConcession.length > 0 && (
                      <Box className="warning-msg mb-20">
                        <i
                          class="fa fa-exclamation-triangle"
                          aria-hidden="true"
                        ></i>
                        Old Applied Concession -{" "}
                        {oldAppliedConcession.concession_type_name} will be
                        replaced with above{" "}
                        {appliedConcession[0].concession_type_name} concession
                      </Box>
                    )}
                    {oldAppliedConcessionType === "feetype" && (
                      <>
                        <Box mt={2} >
                          <Box fontSize='15px' display='inline'>Concession type - </Box>
                          <Box fontSize='18px' display='inline' >
                            {(oldAppliedConcession && oldAppliedConcession[0] && oldAppliedConcession[0]['concession_type_name'])
                              ? (oldAppliedConcession[0]['concession_type_name']) : '' }
                          </Box>
                        </Box>
                        <table width="100%" className="finance-custom-table">
                          <thead>
                            <tr className="finance-table-custom-header">
                              <th>Fee Type</th>
                              <th>Fee Amount1</th>
                              <th>Concession Percentage</th>
                              <th>Concession Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {oldAppliedConcession &&
                              oldAppliedConcession.map((data, index) => {
                                return (
                                  <tr key={index} className="text-dark-75">
                                    <td className="text-center table-data">
                                      {data.standard_fee_name}
                                    </td>
                                    <td className="text-center table-data">
                                      {data.fee_amount}
                                    </td>
                                    <td className="text-center table-data">
                                      {data.concession_in_perc}
                                    </td>
                                    <td className="text-center table-data">
                                      {data.concession_amount}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </>
                    )}
                    {oldAppliedConcessionType === "total" && (
                      <>
                        <table width="100%" className="finance-custom-table">
                          <thead>
                            <tr className="finance-table-custom-header">
                              <th>Concession Percentage</th>
                              <th>Concession Amount</th>
                              <th>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {oldAppliedConcession &&
                              oldAppliedConcession.map((data, index) => {
                                return (
                                  <tr key={index} className="text-dark-75">
                                    <td className="text-center table-data">
                                      {data.concession_in_perc}
                                    </td>
                                    <td className="text-center table-data">
                                      {data.concession_amount}
                                    </td>
                                    <td className="text-center table-data">
                                      ₹ {data.standard_fee_total_amount}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </>
                    )}

                    <Box className=" end-flex-prop">
                      {appliedConcessionId &&
                        isUserHasPermission(
                          "student_fee_concession",
                          "delete"
                        ) && (
                          <Button
                            variant="contained"
                            color="secondary"
                            className="margin-20 "
                            onClick={() => this.deleteConcession()}
                          >
                            Delete
                          </Button>
                        )}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
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
      </div>
    );
  }
}

export default withRouter(StudentFeeConcession);
