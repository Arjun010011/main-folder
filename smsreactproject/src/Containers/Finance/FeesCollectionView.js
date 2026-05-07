import React, { Component } from "react";
import { Paper, Box, Grid, CircularProgress, Tabs, Tab } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import { cloneDeep } from "lodash";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { withRouter } from "react-router";
import { bindActionCreators } from "redux";

import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import StudentDataTable from "./FeeCollection/student";
import MyAdjustmentsList from "./Components/MyAdjustmentsList";
import { Dropdown } from "Components/DropDown";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import {
  checkLocalAcademicYear,
  checkLocalStandard,
  SetStandard,
  getPaginationProps,
  SetAcademicYear,
  isUserHasPermission,
} from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import Checkbox from "@material-ui/core/Checkbox";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { isQuickFeeModal } from "Includes/CheckFormDefinition";

const fee_config = JSON.parse(localStorage.getItem("fee_configurations"))
  ? JSON.parse(localStorage.getItem("fee_configurations"))
  : {};
const isEnabledSequence = fee_config?.["hide_fee_term_sequence"]
  ? fee_config?.["hide_fee_term_sequence"] == 1
    ? false
    : true
  : false;

class FeesCollectionView extends Component {
  state = {
    loading: true,
    yearList: [],
    standardList: [],
    year: "",
    standard: "",
    studentList: [],
    loadingStd: true,
    pagination: cloneDeep(DEFAULT_PAGINATION_PROPS),
    blankPageMessage: "",
    isQuickFee: false,
    maxDateForFilter: null,
    adjustmentEnabled: false,
    showProgress: false,
    yearError: "",
    standardError: "",
    is_quick_fee_modal: isQuickFeeModal(),
    groupList: [],
    sectionList: [],
    section: "",
    loadingsec: false,
    adjustmentTabValue: 0, // 0 = All adjustments, 1 = My adjustments
  };
  apiHitTime = new Date().getTime();
  callApi = false;
  setTime = null;

  componentDidMount() {
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    let is_quick_fee = localStorage.getItem("quick_fee");
    this.setQuickFee(is_quick_fee);
    let pagination_temp = cloneDeep(this.state.pagination);
    if (this.props.location.pathname === Actions.fee_adjustment.view.url) {
      if (pagination_types["fee_adjustment"]) {
        pagination_temp["page"] = pagination_types["fee_adjustment"]["page"];
        pagination_temp["rowsPerPage"] =
          pagination_types["fee_adjustment"]["rowsPerPage"];
        // pagination_temp['searchText'] = pagination_types['fee_adjustment']?.['searchText'] ?? ''
        this.setState(
          {
            pagination: cloneDeep(pagination_temp),
            adjustmentEnabled: true,
          },
          () => {
            this.getAcademicYear();
          }
        );
      } else {
        this.setState({ adjustmentEnabled: true }, () => {
          this.getAcademicYear();
        });
      }
    } else if (pagination_types["fee_collection"]) {
      pagination_temp["page"] = pagination_types["fee_collection"]["page"];
      pagination_temp["rowsPerPage"] =
        pagination_types["fee_collection"]["rowsPerPage"];
      // pagination_temp['searchText'] = pagination_types['fee_collection']?.['searchText'] ?? ''
      this.setState(
        {
          pagination: cloneDeep(pagination_temp),
        },
        () => {
          this.getAcademicYear();
        }
      );
    } else {
      this.getAcademicYear();
    }
    this.getGroupList();
  }

  getGroupList = () => {
    const params = { is_active: true };
    getRequest(GET_URL.getstudentgroups.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          this.setState({
            groupList: response.data.data,
          });
        }
      }
    );
  };

  handleChange = (event) => {
    this.setState({ paymentValue: event.target.value });
  };

  onChange = (e) => {
    let { name, value } = e.target;

    if (name === "standard" && this.state.year !== 0) {
      this.setState({ loading: true });
    }
    if (name === "standard" && this.state.year === 0) {
      alert("Please select Academic year");
    } else if (value !== 0) {
      this.setState({ [name]: value, studentList: [] }, async () => {
        if (name === "standard") {
          SetStandard(value);
          this.setState({
            standardError: "",
            sectionList:[]
          });
          this.getSectionList();
          this.getFinanceStudentList("default");
        } else if (name === "year") {
          SetAcademicYear(value);
          if (value) {
            this.setState({
              yearError: "",
            });
          }
          this.getStandardsList(value);
        } else if (name === "section") {
          this.getFinanceStudentList("default");
        }
      });
    }
  };

  getSectionList = () => {
    const { year, standard } = this.state;
    const url = GET_URL.getsection.api;
    const params = {
      academic_year: year,
      is_active: true,
      standard: standard,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let sectionList = response.data.data;
        let temp = { standard_section: "all", id: "all", name: "All" };
        sectionList.unshift(temp);
        this.setState({
          loadingsec: false,
          section: "all",
          sectionList,
        });
      }
    });
  };

  getFinanceStudentList = (paginationProps) => {
    this.setState({ loading: true });
    let { pagination, year, standard, adjustmentEnabled, section} = this.state;
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    if (paginationProps === "default") {
      this.currentPagination = cloneDeep(DEFAULT_PAGINATION_PROPS);
      if (adjustmentEnabled) {
        delete pagination_types.fee_adjustment;
      } else {
        delete pagination_types.fee_collection;
      }
      let temp_new = { ...pagination_types };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    } else if (paginationProps) {
      this.currentPagination = { ...paginationProps };
      let temp = {};
      if (adjustmentEnabled) {
        temp = { fee_adjustment: this.currentPagination };
      } else {
        temp = { fee_collection: this.currentPagination };
      }
      let temp_new = { ...pagination_types, ...temp };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    } else {
      this.currentPagination = pagination;
    }
    let searchText = this.currentPagination.searchText;
    // this.setState({ pagination: { ...this.state.pagination, searchText: searchText } })
    let pagination_params = getPaginationProps(this.currentPagination);
    let url = GET_URL.fianceStudentlist.api;
    let params = { ...pagination_params, standard, academic_year: year };
    let props = { return_error: true };
    if (paginationProps?.["student_group"]) {
      params["student_group"] = paginationProps["student_group"];
    }
    if (section && section!=='all') {
      params["standard_section_ids"] = section;
    }
    params["admission_history"] = true;
    // Add filter for adjustments created by current user
    if (adjustmentEnabled && this.state.adjustmentTabValue === 1) {
      params["adjustment_created_by_user"] = true;
    } 
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        this.setState({ showProgress: true }, () => {
          this.callApi = true;
          const studentList = response.data;
          studentList.data.student_list.map((data, index) => {
            data["total_discount_amount"] = data?.concession_amount ? (data?.concession_amount + data?.total_adjusted_amount):data.total_adjusted_amount
            data["parent_name"] = data?.student_parent?.parent?.father_name
              ? `${data?.student_parent?.parent?.father_name} [F]`
              : data?.student_parent?.parent?.mother_name
              ? `${data?.student_parent?.parent?.mother_name} [M]`
              : data?.student_parent?.guardian
              ? `${data?.student_parent?.guardian?.guardian_name} [G]`
              : "";
          });
          this.setState({
            studentList: studentList.data,
            blankPageMessage: "",
            loading: false,
            showProgress: false,
            pagination: this.currentPagination,
            //   ? this.currentPagination
            //   : this.state.pagination,
          });
        });
      } else {
        this.setState({
          blankPageMessage: response.data,
          loading: false,
          showProgress: false,
        });
      }
    });
  };

  setFeeCollectionAcademicYear = (yearList) => {
    const year = checkLocalAcademicYear(yearList);
    let loading = false;
    let loadingStd = false;
    if (year !== 0) {
      loading = true;
    }
    this.setState(
      { yearList, year: year ? year : "", loading, loadingStd },
      () => {
        if (year) {
          this.getStandardsList(year);
          this.setMaxDate();
        }
      }
    );
  };

  setMaxDate = () => {
    const { yearList, year } = this.state;
    for (const tempYear of yearList) {
      if (tempYear["id"] === year) {
        this.setState({ maxDateForFilter: tempYear["end_date"] });
        break;
      }
    }
  };

  getAcademicYear = () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      const params = { is_active: true, is_finance_page: true };
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

  getStandardsList = (year) => {
    const { adjustmentEnabled } = this.state;
    const params = { academic_year: year , is_finance_page: true};
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        const standard = checkLocalStandard(standardList);
        let loading = false;
        if (standard) {
          loading = true;
        }
        this.setState(
          {
            standardList,
            standard: standard ? standard : "",
            loading,
            loadingStd: false,
            sectionList:[]
          },
          () => {
            if (standard) {
              this.getFinanceStudentList();
              this.getSectionList();
            } else {
              this.setState({
                standardError: (
                  <FormattedMessage {...commonMessages.selectStandard} />
                ),
              });
            }
          }
        );
      }
    });
  };

  setQuickFee = (value) => {
    localStorage.setItem("quick_fee", value);
    value = value === "true" || value === true ? "true" : "false";
    this.setState({
      isQuickFee: value,
    });
  };

  updatePermissions = (name) => {
    const hasViewPermission = isUserHasPermission("fee_collection", "view");
    const hasAddPermission = isUserHasPermission("fee_collection", "create");
    const hasAdjustmentPermission = isUserHasPermission(
      "fee_adjustment",
      "create"
    );
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    } else {
      this.props.history.push(Actions.fee_collection.view.url);
    }
    if (hasAddPermission) {
      enabledActions.push("create");
    }
    if (name === "display") {
      if (this.state.adjustmentEnabled) {
        return hasAdjustmentPermission;
      } else {
        return hasAddPermission;
      }
    }
    this.setState({
      enabledActions: enabledActions,
      adjustmentPermission: hasAdjustmentPermission,
    });
  };

  setIntervalTime = (paginationProps) => {
    this.setTime = setInterval(() => {
      clearInterval(this.setTime);
      this.getFinanceStudentList(paginationProps);
    }, 1500);
  };

  updateStudentList = (paginationProps, action) => {
    // if (action === 'search') {
    //   this.setState({
    //     showProgress: true,
    //   }, () => {
    //     clearInterval(this.setTime);
    //     this.setIntervalTime(paginationProps)
    //   })
    // }
    // else {

    this.getFinanceStudentList(paginationProps);
    // }
  };

  render() {
    const {
      year,
      yearList,
      standardList,
      standard,
      studentList,
      loading,
      loadingStd,
      pagination,
      maxDateForFilter,
      adjustmentEnabled,
      yearError,
      standardError,
      showProgress,
      groupList,
      is_quick_fee_modal,
      sectionList,
      section,
      loadingsec,
    } = this.state;
    const { updateStudentList } = this;
    return (
      <Paper>
        <Box className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} sm={12}>
              <Box className="header-align">
                <Box className="heading">
                  {!adjustmentEnabled ? (
                    <FormattedMessage {...messages.viewFeeCollectionHeading} />
                  ) : (
                    <FormattedMessage {...messages.viewFeeAdjustmentHeading} />
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item md={6} xs={12}>
              <Box display="flex">
                <Box className="header-align mb-10 margin-right-10">
                  <Dropdown
                    data={yearList}
                    name="year"
                    value={year}
                    onChange={this.onChange}
                    label={
                      <FormattedMessage {...commonMessages.academicYear} />
                    }
                    hideSelect={true}
                    error={yearError}
                  />
                </Box>
                <Box className="header-align mb-10 margin-right-10">
                  {!loadingStd ? (
                    <Dropdown
                      data={standardList}
                      name="standard"
                      value={standard}
                      onChange={this.onChange}
                      label={<FormattedMessage {...commonMessages.standard} />}
                      hideSelect={true}
                      helperText={standardError}
                    />
                  ) : (
                    <Skeleton
                      variant="rect"
                      className="drop-down-skeleton margin-top-30 "
                    ></Skeleton>
                  )}
                </Box>
                {sectionList.length > 2 && (
                  <Box className="header-align mb-10 margin-right-10">
                    {!loadingsec ? (
                      <Dropdown
                        customId="standard_section"
                        data={sectionList}
                        name="section"
                        value={section}
                        onChange={this.onChange}
                        label={<FormattedMessage {...commonMessages.section} />}
                      />
                    ) : (
                      <Skeleton
                        variant="rect"
                        className="drop-down-skeleton margin-top-30 "
                      ></Skeleton>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item md={1} xs={6}></Grid>
            <Grid item md={12} xs={12}>
              {adjustmentEnabled && (
                <Box mb={2}>
                  <Tabs
                    value={this.state.adjustmentTabValue}
                    onChange={(event, newValue) => {
                      this.setState({ adjustmentTabValue: newValue }, () => {
                        // Only refresh student list for "All Adjustments" tab
                        if (newValue === 0) {
                          this.getFinanceStudentList("default");
                        }
                      });
                    }}
                    indicatorColor="primary"
                    textColor="primary"
                  >
                    <Tab label="Students List" />
                    <Tab label="Adjustments Given by Me" />
                  </Tabs>
                </Box>
              )}
              {!adjustmentEnabled && is_quick_fee_modal && (
                <Box pl={1}>
                  <FormattedMessage
                    {...messages.viewFeeCollectionenableQuickFee}
                  />
                  <Checkbox
                    onChange={() =>
                      this.setQuickFee(
                        this.state.isQuickFee === "true" ? "false" : "true"
                      )
                    }
                    color="primary"
                    name="isQuickFee"
                    checked={this.state.isQuickFee === "true" ? true : false}
                    inputProps={{
                      "aria-label": "primary checkbox",
                    }}
                  />
                </Box>
              )}
              <Box mt={2} className="position-relative">
                {adjustmentEnabled && this.state.adjustmentTabValue === 1 ? (
                  <MyAdjustmentsList
                    year={year}
                    standard={standard}
                    pagination={pagination}
                  />
                ) : (
                  <>
                    {/* {showProgress &&
                      <div className='position-absolute zindex-1'>
                        <CircularProgress className='white-text' />
                      </div>
                    } */}
                    {/* {!showProgress && */}
                    <StudentDataTable
                      data={studentList}
                      standardId={standard}
                      yearId={year}
                      quickpay={adjustmentEnabled ? false : this.state.isQuickFee}
                      pagination={pagination}
                      getFinanceStudentList={updateStudentList}
                      loading={loading}
                      maxDate={maxDateForFilter}
                      adjustmentEnabled={adjustmentEnabled}
                      tableError={this.state.blankPageMessage}
                      updatePermissions={this.updatePermissions}
                      onSearchChange={this.onSearchChange}
                      groupList={groupList}
                      showOnlyMyAdjustments={false}
                      hideSetAdjustmentButton={false}
                    />
                    {/* } */}
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
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
  connect(mapStateToProps, mapDispatchToProps)(FeesCollectionView)
);
