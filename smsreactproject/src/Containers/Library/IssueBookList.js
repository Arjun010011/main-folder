import React, { Component, Fragment } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import { Link } from "react-router-dom";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { withRouter } from "react-router-dom";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { GET_URL } from "Includes/urls";
import {
  isUserHasPermission,
  getPaginationProps,
  dateFormat,
  getUrlParam,
  getLibCategory,
  setLibCategory,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { Dropdown } from "Components/DropDown";
import Skeleton from "@material-ui/lab/Skeleton";
import { cloneDeep } from "lodash";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import StudentListActions from "Includes/StudentListActions";
import ReturnOrRenewBookModal from "./Components/ReturnOrRenewBookModal";
import Swal from "sweetalert2";
import ErrorHandler from "Components/ErrorHandler";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const statusList = [
  {
    id:1,            // id: "all",
    name: "All",
  },
  {
    id:2,             // id: "is_returned_only",
    name: "Returned",
  },
  {
    id:3,             // id: "is_issued_only",
    name: "Not Returned",
  },
  {
    id:4,             // id: "is_renewed_only",
    name: "Renewed",
  },
];

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

class IssueBookList extends Component {
  constructor() {
    super();
    this.permission = ["return", "renew"];
    this.state = {
      categoryList: [],
      subCategoryList: [],
      selectedCategory: "",
      selectedSubCategory: "",
      selectedUser: "all",
      selectedStatus: [],
      pagination:  {
        rowsPerPage: 10,
        page: 0,
        sortOrder: { name: "modified", direction: "desc" },
      },
      issueBookList: [],
      bookInformations: {},
      action: "",
      isSubCategory: false,
      error: "",
      loading: true,
      closeMenu: true,
      tableUpdating: false,
      errorContent: "",
      enabledActions: [],
      loadingCategory: false,
      initialFilterOpen: true,
      loadingTable: false,
      isOpenReturnModal: false,
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
          name: "book_copy_name",
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
          name: "modified",
          label: "Last Modified",
          options: {
            filter: false,
            sort: true,
            display: false,
            viewColumns: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return value ? dateFormat(value, "DD-MM-YYYY hh:mm A") : "—";
            },
          },
        },
        {
          name: "renewed_at",
          label: "Renewed At",
          options: {
            filter: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY hh:mm A");
            },
            display:false,
          },
        },
        {
          name: "issued_to_user_data",
          label: "User Type",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <>{value?.user_type.toUpperCase() == 'STAFF' ? <Box>Staff</Box> : <Box>Student</Box>}</>
              );
            },
          },
        },
        {
          name: "issued_to_user_data",
          label: "User Detail",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <>{value?.name}</>;
            },
          },
        },
        {
          name: "issued_to_user_data",
          label: "Standard",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <>{value?.standard}</>;
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
              return dateFormat(value, "DD-MM-YYYY");
            },
          },
        },
        {
          name: "returned_at",
          label: "Returned Date",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY");
            },
            display:false,
          },
        },
        {
          name: "status",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            download: false,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              if (value.toUpperCase() == 'ISSUED') {
                return <div className="text-green">Not Returned</div>;
              } else if (value.toUpperCase() == 'RETURNED') {
                return <div className="text-red">Returned</div>;
              } else if (value.toUpperCase() == 'RENEWED') {
                return <div className="text-blue">Renewed</div>;
              }
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteStockItem}
                    editURL={Actions.library_books.update.url}
                    viewURL={Actions.library_books.view.url}
                    enabledActions={this.permission}
                    handleActive={this.handleActive}
                  />
                </div>
              );
            },
          },
        },
      ],
      old_columns:[],
    };
    this.setTime = null;
  }

  handleActive = (id, index, action) => {
    const { issueBookList } = this.state;
    let bookInformations = issueBookList.data_list[index];
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
    let { type } = getUrlParam();
    let { columns} = this.state;
    this.setState(
      // {
      //   selectedStatus: type ? type : "all",
      // },
      {
        old_columns:columns
      },
      () => {
        this.getCategoryList();
      }
    );
  }

  getCategoryList = () => {
    let { selectedCategory } = this.state;
    const uel = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(uel, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length == 1) {
          selectedCategory = response.data.data[0];
        } else if (getLibCategory()) {
          selectedCategory = getLibCategory();
        }
        this.setState(
          {
            categoryList: response.data.data,
            loadingCategory: false,
            selectedCategory: selectedCategory,
            loading: selectedCategory ? true : false,
          },
          () => {
            if (selectedCategory) {
              this.getSubCategoryList(selectedCategory["id"])
              this.getIssueList();
            }
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

  handleStandardChange = (newValue, isTriggerApi) => {
    let { old_columns,pagination } = this.state;
    let updatedColumns = old_columns.map((col) => {
      if (col.name === "returned_at" && newValue.length >0) {
        return {
          ...col,
          options: {
            ...col.options,
            display: newValue[0].id === 2,
          },
        };
      } else if (col.name === "renewed_at" && newValue.length >0) {
        // this.setState({
        //   pagination: {
        //     ...pagination,
        //     // sortOrder: { name: "renewed_at", direction: "desc" },
        //   },
        // });
        return {
          ...col,
          options: {
            ...col.options,
            display: newValue[0].id === 4,
          },
        };
      }
      return col;
    });
  
    this.setState(
      {
        selectedStatus: newValue,
        columns: updatedColumns,
      },
      () => {
        if (isTriggerApi) {
          this.getIssueList();
        }
      }
    );
  };

  getIssueList = (paginationProps) => {
    let {
      selectedSubCategory,
      selectedCategory,
      pagination,
      selectedStatus,
      selectedUser,
    } = this.state;
    this.currentPagination = pagination;
    this.setState({ tableUpdating: true });
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = GET_URL.issuereturnbook.api;
    let params = { ...pagination_params, is_active: true };

    if (selectedStatus && selectedStatus.length > 0) {
      params["status"] = selectedStatus.map(status => status.id).join(",");
  }
    if (selectedUser) {
      params["user_type"] = selectedUser === "all" ? "all" : selectedUser;
    }
    if (selectedCategory && selectedCategory["id"] !== "all") {
      params["category"] = selectedCategory["id"];
    }
    if (selectedSubCategory && selectedSubCategory["id"] !== "all") {
      params["sub_category"] = selectedSubCategory["id"];
    }
    let prop = { ...this.props };
    let transaction_id = Date.now();
    if (paginationProps === "download") {
      params["long_running_process"] = 1;
      params["transaction_id"] = transaction_id;
    }
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          clearInterval(this.setTime);
          this.setState(
            {
              transaction_id: transaction_id,
              tableUpdating: true,
              count: 60,
            },
            () => {
              this.setIntervalTime();
            }
          );
        } else {
          this.setState({ loadingTable: true }, () => {
            response.data.data.data_list.map((data) => {
              data["book_copy_name"] = data.book_copy_data?.["book_number"];
              data["category_name"] = data.stock_details?.["category_name"];
              data["item_name"] = data.stock_details?.["item_name"];
              data["property_values"] = data.stock_details?.["property_values"];
              data["sub_category_name"] =
                data.stock_details?.["sub_category_name"];
            });
            this.setState({
              issueBookList: cloneDeep(response.data.data),
              loadingTable: false,
              tableUpdating: false,
              loading: false,
              isSubCategory: selectedCategory === "all" ? false : true,
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
    let { number_of_hites, issueBookList } = this.state;
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

  selectUser = (e) => {
    this.setState({
      selectedUser: e.target.value
    })
  }

  geFilterOptions = () => {
    let { selectedUser, initialFilterOpen, loadingCategory } = this.state;
    if (initialFilterOpen) {
      this.setState({ initialFilterOpen: false, loadingCategory: true }, () => {
        this.getCategoryList();
      });
    }
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
        <Box className="margin-top-20">
          <Dropdown
            data={userTypeList}
            name={"selectedUser"}
            value={selectedUser}
            onChange={(e) => this.selectUser(e)}
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
    this.getIssueList();
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          selectedUser: "all",
        },
        () => {
          this.getIssueList();
        }
      );
    }
  };

  handleDropDownSearch = (value, name) => {
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getIssueList();
        if (name === "selectedCategory") {
          setLibCategory(value);
          if (value["id"] !== "all") {
            this.getSubCategoryList(value["id"]);
          }
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
      error,
      pagination,
      selectedStatus,
      loadingTable,
      isOpenReturnModal,
      action,
      bookInformations,
      categoryList,
      selectedCategory,
      selectedSubCategory,
      subCategoryList,
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
      onFilterChange: (column, filterList, type) => {
        this.onFilterChangeHandler(type, filterList);
      },
      onDownload: () => {
        return this.getIssueList("download");
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
                  {Actions.library_issue_book.view.label}
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                {isUserHasPermission("library_issue_book", "create") && (
                  <Box className="header-align end-flex-prop">
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.library_issue_book.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                      {Actions.library_issue_book.create.label}
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
            <Grid container spacing={3}>
              <Grid item md={3} xs={12} className="margin-top-30">
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
                />
              </Grid>
              {selectedCategory && subCategoryList.length > 0 && (
                <Grid item md={3} xs={12} className="margin-top-30">
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
                  />
                </Grid>
              )}
              {selectedCategory && (
                <Grid item md={3} xs={12} className="margin-top-30">
                  {/* <Dropdown
                    data={statusList}
                    name="selectedStatus"
                    style="width-100"
                    value={selectedStatus}
                    onChange={(e) => this.handleStandardChange(e, true)}
                    label={"Status"}
                    error={error.selectedStatus}
                    hideSelect={true}
                    size="small"
                  /> */}
                  <MultipleSelectDropdown
                    data_list={statusList}
                    selected_list={selectedStatus}
                    label={"Status"}
                    error={error.selectedStatus}
                    onChange={(e) => this.handleStandardChange(e, true)}
                    style="width-100"
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
            {!selectedCategory ? (
              <BlankPagewithIcon data={"Select Category To Get List"} />
            ) : (
              <>
                {!loadingTable && (
                  <AllMUIDataTable
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    key={issueBookList.data_list}
                    data={issueBookList.data_list}
                    columns={columns}
                    options={options}
                    onTableChange={this.getIssueList}
                    serverSide={true}
                    pagination={pagination}
                    count={issueBookList.count}
                  />
                )}
              </>
            )}
          </Paper>
          {isOpenReturnModal && (
            <ReturnOrRenewBookModal
              action={action}
              closeInParent={this.handleCloseReturn}
              bookInformations={bookInformations}
            />
          )}
        </Box>
      );
    }
  }
}

export default withRouter(IssueBookList);
