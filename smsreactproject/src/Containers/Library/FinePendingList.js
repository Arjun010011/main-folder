import React, { Component, Fragment } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { withRouter } from "react-router-dom";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  isUserHasPermission,
  getPaginationProps,
  dateFormat,
  validateDate,
  getUrlParam,
  getLibCategory,
  setLibCategory,
  numberWithCommas,
} from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST, minDate, maxDate } from "Constants";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Dropdown } from "Components/DropDown";
import Skeleton from "@material-ui/lab/Skeleton";
import { cloneDeep } from "lodash";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import StudentListActions from "Includes/StudentListActions";
import ReturnOrRenewBookModal from "./Components/ReturnOrRenewBookModal";
import Swal from "sweetalert2";
import ErrorHandler from "Components/ErrorHandler";

const userTypeList = [
  {
    id: "all",
    name: "All",
  },
  {
    id: "student",
    name: "Student",
  },
  {
    id: "staff",
    name: "Staff",
  },
];

class FineList extends Component {
  constructor() {
    super();
    this.permission = ["return", "renew"];
    this.state = {
      categoryList: [],
      subCategoryList: [],
      selectedCategory: "",
      selectedSubCategory: "",
      selectedUser: "all",
      selectedStatus: "is_issued_only",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      issueBookList: [],
      bookInformations: {},
      action: "",
      isSubCategory: false,
      error: "",
      fieldError: {},
      loading: true,
      closeMenu: true,
      tableUpdating: false,
      errorContent: "",
      enabledActions: [],
      loadingCategory: false,
      initialFilterOpen: true,
      loadingTable: false,
      isOpenReturnModal: false,
      number_of_hites: 40,
      selectedDate: new Date(),
      columns: [
        {
          name: "id",
          label: "Book Number",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: false,
          },
        },
        {
          name: "is_issued",
          label: "Is Issued",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: false,
          },
        },
        {
          name: "name",
          label: "User Name",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "current_standard_name",
          label: "Standard",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              try {
                const standardName =
                tableMeta.tableData[tableMeta.rowIndex].issued_to_user.student.current_standard_name;
                return standardName;
              } catch {
                return "-";
              }
            },
          },
        },
        {
          name: "user_type",
          label: "User Type",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (value);
            },
          },
        },
        {
          name: "book_number",
          label: "Book Number",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "issued_at",
          label: "Issued At",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY hh:mm A");
            },
          },
        },
        {
          name: "due_date",
          label: "Due Date",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY hh:mm A");
            },
          },
        },
        {
          name: "fine_amount",
          label: "Fine Amount",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => {
              return numberWithCommas(value ?? 0);
            },
          },
        },
      ],
    };
  }

  handleActive = (id, index, action) => {
    const { issueBookList } = this.state;
    let bookInformations = issueBookList.data[index];
    this.setState({
      bookInformations,
      action,
      isOpenReturnModal: true,
    });
  };

  handleCloseReturn = () => {
    this.setState({
      bookInformations: {},
      action: "",
      isOpenReturnModal: false,
    });
  };

  componentDidMount() {
    let { type, is_staff } = getUrlParam();
    this.setState(
      {
        selectedStatus: type ? type : "all",
      },
      () => {
        this.getCategoryList();
      }
    );
  }

  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 5000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      this.setState({ tableUpdating: false })
      clearInterval(this.setTime);
    }
  };

  getlongprocessingapiresult = () => {
    let { number_of_hites, issueBookList, loadingTable } = this.state;
    this.setState({
      number_of_hites: number_of_hites - 1,
    });
    if (number_of_hites === 0) {
      Swal.fire({
        type: "error",
        title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
        showConfirmButton: true,
      });
      clearInterval(this.setTime);
      return;
    }
    let params = {
      transaction_id: this.state.transaction_id,
      is_active: true,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;

    if (this.state.count === 0) {
      clearInterval(this.setTime);
      this.setState({
        tableUpdating: false,
        totalFeeError: true,
      });
    }
    getRequest(GET_URL.longprocessingapiresult.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          if (response?.data?.data?.is_process_running === false) {
            if (response.data.data?.result_data?.error) {
              ErrorHandler({
                response: {
                  status: 400,
                  data: response.data.data.result_data.error,
                },
              });
              this.setState({
                loadingIdCard: {},
                issueBookList: { ...issueBookList },
                loadingTable: false,
              });
            } else {
              const height = (window.screen.height * 75) / 100;
              const width = (window.screen.width * 75) / 100;
              const mywindow = window.open(
                response.data.data?.result_data?.url,
                "_self"
                // "PRINT",
                // "height=" + height + ",width=" + width + ""
              );
            }
            this.setState({
              loading: false,
              loadingIdCard: {},
              issueBookList: { ...issueBookList },
              loadingTable: false,
              tableUpdating: false,
            });
            // mywindow.print();
            clearInterval(this.setTime);
          }
        } else {
          clearInterval(this.setTime);
          this.setState({
            tableUpdating: false,
            totalFeeError: true,
            loadingIdCard: {},
          });
        }
      }
    );
  };

  getCategoryList = () => {
    let { selectedCategory } = this.state;
    const uel = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(uel, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length === 1) {
          selectedCategory = response.data.data[0];
        } else if (getLibCategory()) {
          selectedCategory = getLibCategory();
        }
        if (selectedCategory) {
          this.getSubCategoryList(selectedCategory["id"]);
        }
        this.setState(
          {
            categoryList: response.data.data,
            loadingCategory: false,
            selectedCategory: { ...selectedCategory },
          },
          () => {
            this.getFinePendingList();
          }
        );
      }
    });
  };

  getSubCategoryList = (id) => {
    let { selectedSubCategory } = this.state;
    const g_url = GET_URL.librarysubcategory.api;
    const params = { is_active: 1, category: id };
    getRequest(g_url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length === 1) {
          selectedSubCategory = response.data.data[0];
        } else if (response.data.data.length > 1) {
          response.data.data.unshift({ id: "all", name: "All" });
          selectedSubCategory = { id: "all", name: "All" };
        }
        this.setState({
          subCategoryList: response.data.data,
          tableUpdating: false,
          loading: false,
          selectedSubCategory: selectedSubCategory,
        });
      }
    });
  };

  handleStandardChange = async (e, isTriggerApi) => {
    let { value, name, error } = e.target;
    if (value !== 0) {
      error = {};
      this.setState(
        {
          [name]: value,
          error,
        },
        () => {
          if (name === "selectedCategory") {
            if (value !== "all") {
              this.getSubCategoryList(value);
            }
          }
          if (isTriggerApi) {
            this.getFinePendingList();
          }
        }
      );
    }
  };

  getFinePendingList = (paginationProps) => {
    let { selectedCategory, selectedSubCategory, pagination, selectedDate, selectedUser} =
      this.state;
    this.currentPagination = pagination;
    this.setState({ tableUpdating: true });
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = POST_URL.libraryreport.api;
    let extra_params = {}
    let params = { ...pagination_params, is_active: true };
    let filters = {
      due_date: dateFormat(selectedDate, "YYYY-MM-DD HH:mm:ss"),
      user_type: selectedUser,
    };
    if (selectedCategory) {
      filters["category"] = selectedCategory["id"];
    }
    if (selectedSubCategory && selectedSubCategory["id"] !== "all") {
      filters["sub_category"] = selectedSubCategory["id"];
    }
    let transaction_id = Date.now();
    if (paginationProps === "download") {
      extra_params["long_running_process"] = 1;
      extra_params['transaction_id'] = transaction_id
      params['download_data'] = true
    }
    let post_data = {
      filters: filters,
      ...params,
    };
    postRequest(url, post_data, this.props, extra_params).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          clearInterval(this.setTime);
          this.setState(
            {
              transaction_id: transaction_id,
              tableUpdating: true,
              count: 60,
              loading: false,
            },
            () => {
              this.setIntervalTime();
            }
          );
        } else {
          this.setState({ loadingTable: true }, () => {
            response.data.data.map((data) => {
              data["name"] = data["issued_to_user"]?.student?.name
                ? data["issued_to_user"]?.student?.name
                : data["issued_to_user"]?.staff?.name;
            });
            this.setState({
              issueBookList: cloneDeep(response.data),
              loadingTable: false,
              tableUpdating: false,
              loading: false,
              pagination: this.currentPagination
                ? this.currentPagination
                : this.state.pagination,
            });
          });
        }
      }
    });
    return false;
  };

  geFilterOptions = () => {
    let { selectedUser, loadingCategory } = this.state;
    if (loadingCategory) {
      return (
        <Fragment>
          <div className="margin-top-20">
            <Skeleton
              variant="rect"
              className="drop-down-skeleton m-t-10px"
            ></Skeleton>
          </div>
        </Fragment>
      );
    }
    return (
      <Fragment>
        {/* <Box className="margin-top-20">
          <Dropdown
            data={categoryList}
            name={"selectedCategory"}
            value={selectedCategory}
            onChange={(e) => this.handleStandardChange(e)}
            label={"Category"}
            hideSelect={true}
            size="small"
          />
        </Box>
        {selectedCategory !== "all" && (
          <Box className="margin-top-20">
            <Dropdown
              data={subCategoryList}
              name={"selectedSubCategory"}
              value={selectedSubCategory}
              onChange={(e) => this.handleStandardChange(e)}
              label={"Sub Catergory"}
              hideSelect={true}
              size="small"
            />
          </Box>
        )} */}
        <Box className="margin-top-20">
          <Dropdown
            data={userTypeList}
            name={"selectedUser"}
            value={selectedUser}
            onChange={(e) => this.handleStandardChange(e)}
            label={"User Type"}
            hideSelect={true}
            size="small"
          />
        </Box>
        <div>
          <Button className="custom-button" onClick={this.handleApplyFilter}>
            Apply Filter
          </Button>
        </div>
      </Fragment>
    );
  };

  handleApplyFilter = () => {
    this.getFinePendingList();
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          selectedUser: "all",
        },
        () => {
          this.getFinePendingList();
        }
      );
    }
  };

  onChangeDate = (value) => {
    let { fieldError } = this.state;
    fieldError["selectedDate"] = validateDate(value, minDate, maxDate);
    if (fieldError["selectedDate"]) {
      this.setState({
        fieldError,
      });
      return;
    }
    fieldError["selectedDate"] = "";
    this.setState(
      {
        fieldError,
        selectedDate: value,
      },
      () => {
        this.getFinePendingList();
      }
    );
  };

  handleDropDownSearch = (value, name) => {
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getFinePendingList();
        if (name === "selectedCategory") {
          setLibCategory(value)
          this.getSubCategoryList(value["id"]);
        }
      }
    );
  };

  render() {
    let {
      issueBookList,
      loading,
      tableUpdating,
      columns,
      fieldError,
      pagination,
      selectedDate,
      loadingTable,
      categoryList,
      subCategoryList,
      selectedCategory,
      selectedSubCategory,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onDownload: () => {
        return this.getFinePendingList("download");
      },
      onFilterChange: (column, filterList, type) => {
        this.onFilterChangeHandler(type, filterList);
      },
    };
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">
                  {Actions.library_pending_fine_list.view.label}
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={3}>
              <Grid item md={3} xs={12} className="margin-top-20">
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <KeyboardDatePicker
                    autoOk
                    size="small"
                    variant="inline"
                    inputVariant="outlined"
                    label={<FormattedMessage {...commonMessages.date} />}
                    fullWidth
                    name="start_date"
                    minDate={minDate}
                    maxDate={maxDate}
                    format="dd-MM-yyyy"
                    value={selectedDate}
                    onChange={(e) => this.onChangeDate(e)}
                    KeyboardButtonProps={{
                      "aria-label": "change date",
                    }}
                    helperText={fieldError.selectedDate}
                    error={fieldError.selectedDate ? true : false}
                  />
                </MuiPickersUtilsProvider>
              </Grid>
              <Grid item md={3} xs={12} className="margin-top-20">
                <DropDownWithSearch
                  options={categoryList}
                  optionValue="name"
                  name={"selectedCategory"}
                  value={selectedCategory}
                  onChange={(e, newValue) =>
                    this.handleDropDownSearch(newValue, "selectedCategory")
                  }
                  label="Category"
                  hideClearIcon={true}
                  className="width-250-px"
                  size="small"
                  error={
                    fieldError[`selectedCategory`] &&
                    fieldError[`selectedCategory`]
                  }
                />
              </Grid>
              <Grid item md={3} xs={12} className="margin-top-20">
                {selectedCategory && subCategoryList.length > 1 && (
                  <DropDownWithSearch
                    options={subCategoryList}
                    optionValue="name"
                    name={"selectedSubCategory"}
                    value={selectedSubCategory}
                    onChange={(e, newValue) =>
                      this.handleDropDownSearch(newValue, "selectedSubCategory")
                    }
                    label="Sub Category"
                    hideClearIcon={true}
                    className="width-250-px"
                    size="small"
                    error={
                      fieldError[`selectedSubCategory`] &&
                      fieldError[`selectedSubCategory`]
                    }
                  />
                )}
              </Grid>
            </Grid>
            {!loadingTable && (
              <AllMUIDataTable
                title={
                  tableUpdating ? (
                    <CircularProgress className="white-text" />
                  ) : (
                    ""
                  )
                }
                key={issueBookList.data}
                data={issueBookList.data}
                columns={columns}
                options={options}
                onTableChange={this.getFinePendingList}
                serverSide={true}
                pagination={pagination}
                count={issueBookList.count}
              />
            )}
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(FineList);
