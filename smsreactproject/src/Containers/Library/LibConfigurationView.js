import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getRequest , deleteRequest } from "Includes/api/apicall";
import Swal from 'sweetalert2'
import { GET_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  SetAcademicYear,
  checkLocalAcademicYear,
  isUserHasPermission,
  updatePermissions,
} from "Includes/functions";
import { options } from "Constants";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import StudentListActions from "Includes/StudentListActions";

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.name} />,
    regex: nameAndNumberRegex,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
  },
  {
    label: <FormattedMessage {...commonMessages.description} />,
    regex: null,
    autoFocus: false,
    name: "description",
    md: 12,
    maxLength: "220",
    className: "width-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: 3,
    type: "text",
  },
];

class LibConfigurationView extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("library_configuration", [
      "update",
      "delete",
    ]);
    this.state = {
      loading: true,
      categoryTypeList: [],
      yearList: [],
      selectedYear: "",
      blankData: "Select Academic Year",
      isBlankPage: true,
      tableLoading: false,
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: true,
            sort: true,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "return_within_days",
          label: <FormattedMessage {...messages.returnWithinDays} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "number_of_books_per_user",
          label: <FormattedMessage {...messages.numberOfBooksPerUser} />,
          options: {
            filter: true,
            sort: true,
          },
        },

        {
          name: "fine_amount",
          label: <FormattedMessage {...messages.fineAmount} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "fine_frequency_in_minutes",
          label: <FormattedMessage {...messages.fineFreqInMin} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "max_fine_amount",
          label: <FormattedMessage {...messages.maxFineAmount} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "is_default",
          label: <FormattedMessage {...messages.isDefault} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{value ? "Yes" : "No"}</div>;
            },
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteType}
                    editURL={Actions.library_configuration.update.url}
                    viewURL={Actions.library_configuration.view.url}
                    enabledActions={this.permission}
                    editExtraParams={this.handleAddConfiguration(
                      tableMeta.rowData[0]
                    )}
                  />
                  {/* <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2]]}
                    label={<FormattedMessage {...messages.editLibAuthors} />}
                    fieldDetails={fieldDetails}
                    baseClassName="action-basic-detail-width"
                    updateUrl={PUT_URL.libraryauthor.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.libraryconfiguration.api}
                    deleteType={this.deleteType}
                    enabledActions={this.permission}
                  /> */}
                </div>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.getAcademicYear();
  }

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = response.data.data;
          const year = checkLocalAcademicYear(yearList);
          this.setState(
            {
              yearList,
              selectedYear: year ? year : "",
              isBlankPage: year ? false : true,
              blankData: year ? "" : "Select Year",
              loading: year ? true : false,
            },
            () => {
              if (year) {
                this.getCategoryTypeList();
              }
            }
          );
        }
      }
    );
  };

  getCategoryTypeList = () => {
    let { categoryTypeList } = this.state;
    let url = GET_URL.libraryconfiguration.api;
    let params = { is_active: 1, academic_year: this.state.selectedYear };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        categoryTypeList = response.data.data;
        this.setState({
          categoryTypeList,
          loading: false,
          tableLoading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    this.setState({ tableUpdating: true })
    let url = DEL_URL.libraryconfiguration.api + id + "/";
    let categoryType = this.state.categoryTypeList;
    deleteRequest(url, {}, this.props).then(response => {
      if (response && response.status === 200) {
        let index = categoryType.findIndex((data) => data.id === id);
        categoryType.splice(index, 1);
        this.setState({
          categoryTypeList: [...categoryType],
        });
        Swal.fire({
          position: 'top-end',
          type: 'success',
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500
        })
      }
    })
  };

  updatePostFormat = (newData) => {
    let payload = {
      author: { name: newData.name, description: newData.description },
    };
    return payload;
  };

  updateType = (newData, id) => {
    let categoryType = this.state.categoryTypeList;
    for (const data of categoryType) {
      if (data.id === id) {
        data.name = newData.name;
        data.description = newData.description;
        break;
      }
    }
    this.setState({
      categoryTypeList: [...categoryType],
    });
    return true;
  };

  onChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;
    if (value) {
      if (name === "selectedYear") {
        this.setState(
          {
            [name]: value,
            isBlankPage: false,
            tableLoading: true,
          },
          () => {
            this.getCategoryTypeList();
          }
        );
        SetAcademicYear(value);
      }
    }
  };

  handleAddConfiguration = (isEdit) => {
    let { selectedYear, yearList } = this.state;
    let yearName;
    yearList.map((data) => {
      if (data.id == selectedYear) {
        yearName = data.name;
      }
    });
    let currentSelectedList = {
      selectedYear: selectedYear,
      yearName: yearName,
    };
    if (isEdit) {
      currentSelectedList["id"] = isEdit;
    }
    let searchParam = "?" + new URLSearchParams(currentSelectedList).toString();
    if (isEdit) {
      return searchParam;
    }
    this.props.history.push({
      pathname: Actions.library_configuration.create.url,
      search: searchParam,
    });
  };

  render() {
    let {
      loading,
      categoryTypeList,
      columns,
      yearList,
      isBlankPage,
      selectedYear,
      blankData,
      tableLoading,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <div className="header-align heading">
                  <FormattedMessage {...messages.libconfiguration} />
                </div>
              </Grid>
              {!isBlankPage && (
                <Grid item md={5} xs={12} sm={12}>
                  <div className="end-flex-prop header-align">
                    {isUserHasPermission("library_configuration", "create") && (
                      <Button
                        variant="contained"
                        component={Link}
                        className="editbutton-view"
                        onClick={() => this.handleAddConfiguration()}
                      >
                        <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                        {Actions.library_configuration.create.label}
                      </Button>
                    )}
                  </div>
                </Grid>
              )}
            </Grid>
            <Grid container className="header-align">
              <Grid item md={12} xs={12}>
                <Dropdown
                  size={"small"}
                  data={yearList}
                  name="selectedYear"
                  value={selectedYear}
                  hideSelect={true}
                  onChange={(e) => this.onChange(e)}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                />
              </Grid>
            </Grid>
            {isBlankPage ? (
              <div className="mt-20">
                <BlankPagewithIcon data={blankData} />
              </div>
            ) : (
              <div className="mt-20">
                <AllMUIDataTable
                  data={categoryTypeList}
                  columns={columns}
                  options={options}
                  title={
                    tableLoading ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                />
              </div>
            )}
          </Paper>
        </div>
      );
    }
  }
}

export default withRouter(LibConfigurationView);
