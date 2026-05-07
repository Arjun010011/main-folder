import React, { Component, Fragment } from "react";
import {
  Paper,
  Box,
  Grid,
  CircularProgress,
  Button,
  Tooltip,
} from "@material-ui/core";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import Skeleton from "@material-ui/lab/Skeleton";
import moment from "moment";
import _ from "lodash";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { withRouter } from "react-router";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import ErrorHandler from "Components/ErrorHandler";
import {
  checkLocalAcademicYear,
  checkLocalStandard,
  SetStandard,
  getPaginationProps,
  isUserHasPermission,
  SetAcademicYear,
  numberWithCommas,
  getFullName,
} from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import { Actions } from "Constants/permissions";
import VisibilityIcon from "@material-ui/icons/Visibility";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import StudentProfileCard from "Components/StudentProfileCard";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class FeesConcessionView extends Component {
  state = {
    loading: true,
    yearList: [],
    standardList: [],
    year: "",
    standard: "",
    studentList: [],
    loadingStd: true,
    pagination: { ...DEFAULT_PAGINATION_PROPS },
    paperError: null,
    groupList:[],
    selected_group:''
  };

  columns = [
    {
      label: <FormattedMessage {...commonMessages.studentName} />,
      name: "first_name",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta) => {
          return (
            <StudentProfileCard
              student_name={getFullName(
                tableMeta.tableData[tableMeta.rowIndex]["first_name"],
                tableMeta.tableData[tableMeta.rowIndex]["middle_name"],
                tableMeta.tableData[tableMeta.rowIndex]["last_name"]
              )}
              id={tableMeta.tableData[tableMeta.rowIndex]["id"]}
              isApiCall={true}
            />
          );
        },
      },
    },
    {
      name: "current_reg_num",
      label: <FormattedMessage {...commonMessages.regNum} />,
      options: {
        filter: false,
        sort: true,
      },
    },
    {
      name: "concession_type_name",
      label: <FormattedMessage {...messages.concessionType} />,
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value) => {
          if (!!value) {
            return value;
          } else {
            return "-";
          }
        },
      },
    },
    {
      name: "concession_amount",
      scrollMaxHeight: { options: this.options },
      label: <FormattedMessage {...messages.concessionAmount} />,
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          if (value > 0) {
            return numberWithCommas(value);
          } else {
            return "-";
          }
        },
      },
    },
    {
      name: "action",
      label: <FormattedMessage {...commonMessages.actions} />,
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          let studentDetails = {};
          this.state.studentList.student_list.map((data) => {
            let id = tableMeta.rowData[7];
            if (data.id === id) {
              studentDetails = data;
            }
          });
          const { year, standard } = this.state;
          let id = studentDetails.id;
          const middle_name = studentDetails.middle_name
            ? studentDetails.middle_name
            : "";
          let name = `${studentDetails.first_name} ${middle_name} ${studentDetails.last_name}`;
          return (
            <Box className="flex-justify-center-flex-prop" width="100%">
              {!studentDetails.concession_applied &&
                !studentDetails.is_fully_paid &&
                isUserHasPermission("student_fee_concession", "create") && (
                  <Button
                    className={"collect-fees"}
                    onClick={() => {
                      this.pushToFeeconcession("add", year, standard, id, name);
                    }}
                    size="small"
                  >
                    <FormattedMessage {...commonMessages.apply} />
                  </Button>
                )}
              {studentDetails?.is_fully_paid &&
                !studentDetails.concession_applied && (
                  <Box>
                    <Tooltip
                      title="Full Fee Already Paid"
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        style={{ color: "#ff3636" }}
                        variant="outlined"
                        size="small"
                      >
                        Already Paid
                        <CheckCircleOutlinedIcon />
                      </Button>
                    </Tooltip>
                  </Box>
                )}
              {studentDetails.concession_applied && (
                <Box>
                  <Button
                    className="approved-button"
                    variant="outlined"
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                  >
                    <FormattedMessage {...commonMessages.applied} />
                    <CheckCircleOutlinedIcon />
                    <Tooltip
                      title="view"
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <VisibilityIcon
                        style={{ color: "#5187FF", verticalAlign: "middle" }}
                        className="cursor-pointer margin-left-10"
                        onClick={() => {
                          this.pushToFeeconcession(
                            "view",
                            year,
                            standard,
                            id,
                            name
                          );
                        }}
                      />
                    </Tooltip>
                  </Button>
                </Box>
              )}
              <Box pl={2}></Box>
            </Box>
          );
        },
        customHeadRender: (columnMeta, updateDirection) => (
          <th
            key={3}
            onClick={() => updateDirection(1)}
            className="subject-width"
          >
            {columnMeta.label}
          </th>
        ),
      },
    },
    {
      name: "middle_name",
      options: {
        display: false,
        download: false,
        filter: false,
      },
    },
    {
      name: "last_name",
      options: {
        display: false,
        download: false,
        filter: false,
      },
    },
    {
      name: "id",
      options: {
        display: false,
        download: false,
        filter: false,
      },
    },
    {
      name: "is_fully_paid",
      options: {
        filter: false,
        display: false,
        searchable: false,
      },
    },
  ];

  pushToFeeconcession = (type, year, standard, student, name) => {
    const searchState = { year, standard, student, name };
    const searchParam = "?" + new URLSearchParams(searchState).toString();
    const pathName =
      type === "view"
        ? Actions.student_fee_concession_individual.view.url
        : Actions.student_fee_concession.create.url;
    this.props.history.push({
      pathname: pathName,
      search: searchParam,
    });
  };

  componentDidMount() {
    this.getAcademicYear();
    this.getGroupList();
  }

  handleChange = (event) => {
    this.setState({ paymentValue: event.target.value });
  };

  onChange = (e) => {
    let { name, value } = e.target;

    if (name === "standard" && this.state.year !== 0) {
      this.setState({ loading: true, pagination: DEFAULT_PAGINATION_PROPS });
    }
    if (name === "standard" && this.state.year === 0) {
      alert("Select Academic year");
    } else if (value !== 0) {
      this.setState({ [name]: value, studentList: [] }, async () => {
        if (name === "standard" || name==="selected_group") {
          SetStandard(value);
          this.getFeeConcessionStudentList();
        }
        if (name === "year") {
          SetAcademicYear(value);
          this.getStandardsList(value);
        }
      });
    }
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          selected_group: null,
        },
        () => {
          this.getFeeConcessionStudentList();
        }
      );
    }
  };

  getFeeConcessionStudentList = (paginationProps) => {
    this.setState({ loading: true });
    let { pagination, year, standard, selected_group } = this.state;
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let url = GET_URL.concessionstudentlist.api;
    let params = { ...pagination_params, standard, academic_year: year };
    let compProps = { ...this.props, return_error: true };
    if (selected_group) {
      params.student_group = selected_group;
    }
    getRequest(url, params, compProps).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data;
        this.setState({
          studentList: studentList.data,
          loading: false,
          paperError: null,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      } else {
        const error = { response };
        compProps = { ...compProps, return_error_message: true };
        const errorMessage = ErrorHandler(error, compProps);
        this.setState({ paperError: errorMessage });
      }
    });
  };

  setFeeCollectionAcademicYear = (yearList) => {
    const year = checkLocalAcademicYear(yearList);
    let loading = false;
    let loadingStd = false;
    if (year) {
      loading = true;
      loadingStd = true;
    }
    this.setState(
      { yearList, year: year ? year : "", loading, loadingStd },
      () => {
        if (year) {
          this.getStandardsList(year);
        }
      }
    );
  };

  getAcademicYear = () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      const params = { is_active: true, is_finance_page: true};
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

  handleSearchChange = (e) => {
    let payment_end_date = moment(e).format("YYYY-MM-DD");
    let paymentDateError = "";
    this.setState({
      payment_end_date,
      paymentDateError,
    });
    let pagination = { ...this.state.pagination };
    pagination["custom"] = {
      payment_end_date,
    };
    this.getFeeConcessionStudentList(pagination, "custom");
  };

  getStandardsList = (year) => {
    const params = { academic_year: year , is_finance_page: true};
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
          {
            standardList,
            standard: standard ? standard : "",
            loading,
            loadingStd: false,
          },
          () => {
            if (standard !== 0) {
              this.getFeeConcessionStudentList();
            }
          }
        );
      }
    });
  };

  getBlankPageMessage = () => {
    let { pagination, studentList, standard, paperError, loading, year } =
      this.state;
    if (
      pagination &&
      studentList.student_list &&
      studentList.student_list.length === 0 &&
      !!!pagination.searchText
    ) {
      paperError = "No students found in this standard";
    }
    if (standard === 0 && year != 0 && !loading) {
      paperError = `Select the ${alias_names["standard"]} to view the student list`;
    }
    return paperError;
  };

  getTitle = () => {
    if (this.state.loading) {
      return <CircularProgress className="white-text" />;
    }
  };

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

  getFeeCollectionCustomFilters = () => {
    const {  groupList, selected_group } = this.state;
    return (
      <Fragment>
        <div className="mt-30">
          <Dropdown
            className="filter-dropdown"
            data={groupList}
            name="selected_group"
            value={selected_group}
            onChange={this.onChange}
            label="Student Group"
          />
        </div>
      </Fragment>
    );
  };

  render() {
    const {
      year,
      yearList,
      standardList,
      standard,
      studentList,
      loadingStd,
      pagination,
    } = this.state;

    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT, 
      customFilterDialogFooter: () => {
        return this.getFeeCollectionCustomFilters();
      },
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type);
      },
    };
    const { getFeeConcessionStudentList, getTitle, columns } = this;
    let blankPageMessage = this.getBlankPageMessage();

    return (
      <Paper>
        <Box className="paper-background">
          <Grid container>
            <Grid item md={12} xs={12} sm={12}>
              <Box className="header-align">
                <Box className="heading">
                  <FormattedMessage {...messages.feeConcession} />
                </Box>
              </Box>
            </Grid>
            <Grid item md={12} xs={12}>
              <Box display="flex" flexWrap="wrap">
                <Box className="header-align">
                  <Dropdown
                    data={yearList}
                    name="year"
                    value={year}
                    onChange={this.onChange}
                    label="Acadamic year"
                    hideSelect={true}
                  />
                </Box>
                <Box className="header-align margin-left-10">
                  {!loadingStd ? (
                    <Dropdown
                      data={standardList}
                      name="standard"
                      value={standard}
                      onChange={this.onChange}
                      hideSelect={true}
                      label={`${alias_names["standard"]}`}
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
            <Grid item md={1} xs={6}></Grid>
            <Grid item md={12} xs={12}>
              <Box mt={2}>
                {!blankPageMessage ? (
                  <>
                    <AllMUIDataTable
                      data={studentList.student_list}
                      key={studentList.student_list}
                      title={getTitle()}
                      columns={columns}
                      options={options}
                      serverSide={true}
                      pagination={pagination}
                      count={studentList.count}
                      onTableChange={(tableState, action) =>
                        getFeeConcessionStudentList(tableState, action)
                      }
                    />
                  </>
                ) : (
                  <BlankPagewithIcon
                    errorOutline={true}
                    data={blankPageMessage}
                  />
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
  connect(mapStateToProps, mapDispatchToProps)(FeesConcessionView)
);
