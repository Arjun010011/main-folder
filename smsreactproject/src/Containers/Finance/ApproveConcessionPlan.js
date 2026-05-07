import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid } from "@material-ui/core";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import { Dropdown } from "Components/DropDown";
import LoadingGif from "Components/LoadingGif";
import { SUCCESS_MSG_PROPS } from "Constants";
import CollapsableConcessionPlan from "./Components/CollapsableConcessionPlan";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { GET_URL, PUT_URL } from "Includes/urls";
import { getRequest, putRequest } from "Includes/api/apicall";
import {
  checkLocalAcademicYear,
  Alert,
  SetAcademicYear,
} from "Includes/functions";

class ApproveConcessionPlanView extends Component {
  state = {
    loading: true,
    yearList: [],
    year: 0,
    standardWiseConcession: [],
  };

  componentDidMount() {
    this.getYearsList();
  }

  getYearsList = async () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      let params = { is_active: true };
      getRequest(GET_URL.getacademicyear.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const yearList = response.data.data;
            this.setFeeCollectionAcademicYear(yearList);
            this.props.setAcademicYear(yearList);
          }
        }
      );
    } else {
      this.setFeeCollectionAcademicYear(storedYearList);
    }
  };

  setFeeCollectionAcademicYear = (yearList) => {
    const year = checkLocalAcademicYear(yearList);
    let loading = false;
    if (year !== 0) {
      loading = true;
    }
    this.setState({ yearList, year, loading }, () => {
      if (year !== 0) {
        this.getStandadWiseConcessionData(year);
      }
    });
  };

  getStandadWiseConcessionData = (value) => {
    this.setState({ loading: true });
    let params = { is_active: 1, academic_year: value };
    getRequest(GET_URL.concessionapprove.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let standardWiseConcession = response.data.data;
          this.setState({ standardWiseConcession });
        }
        this.setState({ loading: false });
      }
    );
  };

  onChange = async (e) => {
    let name = e.target.name;
    let value = e.target.value;
    if (value !== 0) {
      this.setState({ [name]: value });
      SetAcademicYear(value);
      this.getStandadWiseConcessionData(value);
    }
  };

  approveAction = (concession_type) => {
    const url = `${PUT_URL.concessionapprove.api}${concession_type}/`;
    putRequest(url, { approval_status: 1 }, this.props).then((response) => {
      if (response && response.status === 200) {
        this.getStandadWiseConcessionData(this.state.year);
        Swal.fire({
          ...SUCCESS_MSG_PROPS,
          title: response.data.Reason,
        });
      }
    });
  };

  handleClose = () => {
    this.setState({
      snackbar: false,
      alertData: "",
    });
  };

  render() {
    const {
      year,
      yearList,
      standardWiseConcession,
      loading,
      snackbar,
      alertData,
    } = this.state;
    if (loading) return <LoadingGif />;

    return (
      <>
        <Paper className={"paper-background"}>
          <Box>
            <Grid container>
              <Grid item md={6} xs={12} className={"header-align"}>
                <Box className="heading">Approve Concession Plans </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="md-up-end-flex-prop md-down-justify-center header-align">
                  <Dropdown
                    data={yearList}
                    name="year"
                    value={year}
                    onChange={this.onChange}
                    label="Select Academic year"
                  />
                </Box>
              </Grid>
            </Grid>
            <Box>
              <Box pb={2} mt={2}>
                {standardWiseConcession.length === 0 && (
                  <BlankPagewithIcon data="Please Change the Acadamic year and expect the result" />
                )}
              </Box>
              <CollapsableConcessionPlan
                approveAction={this.approveAction}
                data={standardWiseConcession}
                year={year}
              />
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
        </Paper>
      </>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAcademicYearList: makeSelectAcademicYear(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setAcademicYear }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(ApproveConcessionPlanView)
);
