import React, { Component } from "react";
import { Paper, Box, Button, Grid, Snackbar } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import { withRouter } from "react-router-dom";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import _ from "lodash";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import FeeConcessionTable from "./Components/FeeConcessionTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import { DEFAULT_PAGINATION_PROPS, TRANSPORT_CODE } from "Constants";
import {
  checkLocalAcademicYear,
  checkLocalStandard,
  SetAcademicYear,
  Alert,
  getPaginationProps,
  isUserHasPermission,
  getPercentValue,
  getPercent,
  SetStandard,
} from "Includes/functions";
import { Dropdown } from "Components/DropDown";

class AssignConcessionTypesView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yearList: [],
      year: 1,
      loading: true,
      standardList: [],
      standard: 2,
      loadingStd: true,
      snackbar: false,
      alertData: "",
      tableLoading: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS },
    };
  }
  componentDidMount() {
    this.getAcademicYear();
  }

  getAcademicYear = () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      const params = { is_active: true };
      getRequest(GET_URL.getacademicyear.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const yearList = response.data.data;
            this.setCompAcademicYear(yearList);
            this.props.setAcademicYear(yearList);
          }
        }
      );
    } else {
      this.setCompAcademicYear(storedYearList);
    }
  };

  setCompAcademicYear = (yearList) => {
    const year = checkLocalAcademicYear(yearList);
    let loading = year !== 0;
    this.setState({ yearList, year, loading }, () => {
      if (year !== 0) {
        this.getStandardsList(year);
      }
    });
  };

  getStandardsList = (year) => {
    const params = { academic_year: year };
    this.setState({ loadingStd: true });
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        const standard = checkLocalStandard(standardList);
        let loading = false;
        if (standard !== 0) {
          loading = true;
        }
        this.setState(
          { standardList, standard, loading, loadingStd: false },
          () => {
            if (standard !== 0) {
              this.getAssignedConcessionTypes();
            }
          });
      }
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    if (name === "standard" && this.state.year === 0) {
      alert("Please select Academic year");
    } else if (value !== 0) {
      this.setState({ [name]: value }, () => {
        if (name === "year") {
          SetAcademicYear(value);
          this.getStandardsList(value);
        } else {
          SetStandard(value)
          this.getAssignedConcessionTypes();
        }
      });
    }
  };

  getAssignedConcessionTypes = (paginationProps, comp_columns) => {
    this.setState({ tableLoading: true });
    let { pagination, standard, year } = this.state;
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination, null, comp_columns);

    let params = {
      ...pagination_params,
      is_active: 1,
      academic_year: year,
      standard: standard,
    };
    getRequest(GET_URL.concession.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const assignedConcessions = response.data.data;
        for (let concession of assignedConcessions.concession_list) {
          let fee_amount = concession.standard_fee_total_amount;
          concession.conc_type = "Concession on Total Amount";
          concession.fee_amount = `₹ ${concession.standard_fee_total_amount}`;
          if (concession.type === "feetype") {
            concession.fee_amount =
              concession.standard_fee_codename === TRANSPORT_CODE
                ? `${concession.standard_fee_amount} %`
                : `₹ ${concession.standard_fee_amount}`;
            fee_amount = concession.standard_fee_amount;
            concession.conc_type = "Concession on Fee type";
          } else {
            concession.standard_fee_name = "-";
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
              concession.concession_amount = `${getPercentValue(
                concession.rate,
                fee_amount
              ).toFixed(0)} `;
            }
            concession.concession_in_perc = `${concession.rate.toFixed(2)}%`;
          }
          concession.is_percentage = !concession.is_amount;
        }
        this.setState({
          assignedConcessions,
          loading: false,
          tableLoading: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  pushToAssignPage = () => {
    const { year, standard } = this.state;
    if (year === 0) {
      this.setState({
        alertData: `Select Academic year to continue`,
        snackbar: true,
        severity: "error",
      });
      return;
    } else if (standard === 0) {
      this.setState({
        alertData: `Select ${alias_names['standard']} to continue`,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    const searchState = { year, standard };
    const searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.assign_consission.create.url,
      search: searchParam,
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
      yearList,
      year,
      loading,
      standardList,
      standard,
      alertData,
      snackbar,
      loadingStd,
      pagination,
      tableLoading,
      assignedConcessions,
    } = this.state;
    const { getAssignedConcessionTypes } = this;
    if (loading) return <LoadingGif />;
    return (
      <>
        <Paper>
          <Box className="paper-background">
            <Grid container>
              <Grid item md={6} xs={12} className={"header-align"}>
                <Box className="heading">Assigned Concessions</Box>
                <Box className="sub-heading"></Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("assign_consission", "create") && (
                    <Button
                      variant="contained"
                      onClick={() => this.pushToAssignPage()}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.assign_consission.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
              <Grid item md={6}>
                <Box className="flex-justify-space-around">
                  <Box className="header-align">
                    <Dropdown
                      data={yearList}
                      name="year"
                      value={year}
                      onChange={this.onChange}
                      label="Select Academic year"
                    />
                  </Box>
                  <Box className="header-align">
                    {!loadingStd ? (
                      <Dropdown
                        data={standardList}
                        name="standard"
                        value={standard}
                        onChange={this.onChange}
                        label="Select Standard"
                      />
                    ) : (
                      <Skeleton
                        variant="rect"
                        className="drop-down-skeleton margin-top-30 "
                      ></Skeleton>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>
            {year !== 0 && standard !== 0 && (
              <FeeConcessionTable
                year={year}
                standard={standard}
                data={assignedConcessions}
                pagination={pagination}
                getAssignedConcessionTypes={getAssignedConcessionTypes}
                applyFilter={false}
                applySearch={true}
                loading={tableLoading}
              />
            )}
            {(!year || !standard) && (
              <Paper className="margin-top-20">
                <BlankPagewithIcon data={`Select Academic year and ${alias_names['standard']} to fetch concessions`} />
              </Paper>
            )}
          </Box>
        </Paper>
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
  connect(mapStateToProps, mapDispatchToProps)(AssignConcessionTypesView)
);
