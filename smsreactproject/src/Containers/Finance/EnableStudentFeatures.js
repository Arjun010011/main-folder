import React, { Component } from "react";
import { Paper, Box, Grid } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";

import StudentEnableFeatureTable from "./Components/StudentEnableFeatureTable";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import {
  checkLocalAcademicYear,
  checkLocalStandard,
  SetStandard,
  getPaginationProps,
  getSettingValue,
  SetAcademicYear
} from "Includes/functions";
import {
  SERVERSIDE_SEARCH_BUFFER_TIME,
  DEFAULT_PAGINATION_PROPS,
} from "Constants";
import loadingBar from "images/loading.gif";
import LoadingGif from "Components/LoadingGif";

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const isResidential = parseInt(getSettingValue('is_residential'));
const studentTypeList = [
  { id: 'D', name: 'Day Scholar' },
  { id: 'R', name: 'Residential' }
];

class EnableStudentFeatures extends Component {
  state = {
    loading: true,
    yearList: [],
    standardList: [],
    year: '',
    standard: '',
    studentList: [],
    loadingStd: true,
    pageloading: true,
    pagination: {
      ...DEFAULT_PAGINATION_PROPS,
    },
  };
  apiHitTime = new Date().getTime();

  componentDidMount() {
    this.getAcademicYear();
  }

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, {}).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = response.data.data;
          const year = checkLocalAcademicYear(yearList);
          let pageloading = false;
          let loadingStd = false;
          let loading = false
          if (year) {
            pageloading = true;
            loadingStd = true;
            loading = true;
          }
          this.setState({ yearList, year: year ? year : '', pageloading, loadingStd, loading }, () => {
            if (year) {
              this.getStandardsList(year);
            }
          });
        }
      }
    );
  };

  handleChange = (event) => {
    this.setState({ paymentValue: event.target.value });
  };

  onChange = (e) => {
    let name = e.target.name;
    let value = e.target.value;

    if (name === "standard" && this.state.year !== 0) {
      this.setState({ loading: true, pagination: DEFAULT_PAGINATION_PROPS, });
    }
    if (name === "standard" && this.state.year === 0) {
      alert("Please select Academic year");
    } else if (value !== 0) {
      this.setState({ [name]: value }, async () => {
        if (name === "standard") {
          SetStandard(value);
          this.getStudentList();
        }
        if (name === "year") {
          this.getStandardsList(value);
          SetAcademicYear(value)
        }
      });
    }
  };

  getStudentList = (paginationProps) => {
    this.setState({ loading: true });
    let { pagination, year, standard } = this.state;
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = { ...pagination_params, academic_year: year, standard };
    getRequest(GET_URL.fianceStudentlist.api, params, { 'return_error_message': true }).then(
      (response) => {
        if (response && response.status === 200) {
          const studentList = response.data;
          this.setState({
            studentList: studentList.data,
            approved_std_id: studentList.data.approved_std_id,
            loading: false,
            pageloading: false,
            pagination: this.currentPagination
              ? this.currentPagination
              : this.state.pagination,
          });
          this.getBlankPageMessage()
        } else {
          this.getBlankPageMessage(response)
        }
      }
    );
  };

  getStandardsList = (year) => {
    const params = { academic_year: year };
    this.setState({ loadingStd: true });
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        const standard = checkLocalStandard(standardList);
        let pageloading = false;
        let loading = false
        if (standard) {
          pageloading = true;
          loading = true;
        }
        this.setState(
          { standardList, standard: standard ? standard : '', pageloading, loadingStd: false, loading, studentList: [] },
          () => {
            if (standard) {
              this.getStudentList();
            }
          }
        );
      }
    });
  };

  getBlankPageMessage = (message = '') => {
    const { pagination, studentList, standard } = this.state;
    if (message === '') {
      if (
        pagination &&
        studentList.student_list &&
        studentList.student_list.length === 0 &&
        !!!pagination.searchText
      ) {
        message = "No students found in this standard";
      }
      if (standard === 0) {
        message =
          `Select ${alias_names['standard']} to view the student list`;
      }
    }
    this.setState({ blankPageMessage: message, loading: false,pageloading:false })
  };

  render() {
    const {
      year,
      yearList,
      standardList,
      standard,
      studentList,
      approved_std_id,
      loading,
      loadingStd,
      pagination,
      blankPageMessage,
      pageloading
    } = this.state;
    const { getStudentList } = this;
    if (pageloading) {
      return <LoadingGif />
    }
    return (
      <Paper>
        <Box className="paper-background">
          <Grid container>
            <Grid item md={12} xs={12} sm={12}>
              <Box className="header-align heading" mt={1}>Features</Box>
              <Box>
                <Box className="content-header-ac">
                  <Box mt={1} className='content-header'>
                    <Dropdown
                      data={yearList}
                      name="year"
                      value={year}
                      onChange={this.onChange}
                      label="Academic year"
                      hideSelect={true}
                    />
                  </Box>
                  <Box className="content-header">
                    <Box mt={1}>
                      {!loadingStd ? (
                        <Dropdown
                          data={standardList}
                          name="standard"
                          value={standard}
                          onChange={this.onChange}
                          label={alias_names['standard']}
                          hideSelect={true}
                        />
                      ) : (
                        <Skeleton
                          variant="rect"
                          className="drop-down-skeleton "
                        ></Skeleton>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item md={1} xs={6}></Grid>
            <Grid item md={12} xs={12}>
              <Box mt={2}>
                {!blankPageMessage ? (
                  <StudentEnableFeatureTable
                    data={studentList}
                    approved_std_id={approved_std_id}
                    standardId={standard}
                    yearId={year}
                    pagination={pagination}
                    getStudentList={getStudentList}
                    loading={loading}
                  />
                ) : (
                  <BlankPagewithIcon data={blankPageMessage} />
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    );
  }
}

export default EnableStudentFeatures;
