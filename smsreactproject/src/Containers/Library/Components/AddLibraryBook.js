import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  Box,
  Dialog,
  Slide,
  Grid,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
} from "@material-ui/core";
import AllMUIDataTable from "Components/AllMUIDataTable";
import CloseIcon from "@material-ui/icons/Close";
import { cloneDeep } from "lodash";
import Tooltip from "@material-ui/core/Tooltip";
import {
  MuiPickersUtilsProvider,
  KeyboardDateTimePicker,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import _ from "lodash";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import {
  checkLocalAcademicYear,
  Alert,
  SetAcademicYear,
  getPaginationProps,
  validateDate,
  dateFormat,
  getLibCategory,
} from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { TrendingUpTwoTone } from "@material-ui/icons";
import { DEFAULT_PAGINATION_PROPS, maxDate, minDate } from "Constants";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import messages from "./../messages";
import commonMessages from "Constants/messages";

const { forwardRef, useRef, useImperativeHandle } = React;

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
}));

let titlePaginationProps = cloneDeep(DEFAULT_PAGINATION_PROPS);
let bookPaginationProps = cloneDeep(DEFAULT_PAGINATION_PROPS);
titlePaginationProps["sortOrder"]["name"] = "title";
bookPaginationProps["sortOrder"]["name"] = "book_number";

const AddLibraryBook = forwardRef((props, ref) => {
  const [open, setOpen] = React.useState(false);
  const [categoryList, setCategoryList] = React.useState([]);
  const [subCategoryList, setSubCategoryList] = React.useState([]);
  const [category, setCategory] = React.useState("all");
  const [subCategory, setSubCategory] = React.useState("all");
  const [itemList, setItemList] = React.useState(null);
  const [pagination, setPagination] = React.useState({
    ...titlePaginationProps,
  });
  const [bookPagination, setBookPagination] = React.useState({
    ...bookPaginationProps,
  });
  const [blankData, setBlankData] = React.useState("Select Category");
  const [tableUpdating, setTableUpdating] = React.useState(false);
  const [openSnackBar, setOpenSnackBar] = React.useState(false);
  const [isSubCategory, setIsSubCategory] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState("title");
  const [errorContent, setErrorContent] = React.useState("");
  const [fieldError, setFieldError] = React.useState({});
  const [selectedTitle, setSelectedTitle] = React.useState({});

  const [pageLoading, setPageLoading] = React.useState(true);

  const [titleColumns] = React.useState([
    {
      name: "title",
      label: <FormattedMessage {...commonMessages.title} />,
      options: {
        filter: true,
        sort: true,
      },
    },

    {
      name: "category_name",
      label: <FormattedMessage {...messages.libCategorySelectCategory} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "sub_category_name",
      label: <FormattedMessage {...messages.libSubCategorySelectCategory} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "number_of_copies",
      label: <FormattedMessage {...messages.libTotalBooks} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "available_stock",
      label: <FormattedMessage {...messages.libAvailableBooks} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "id",
      label: "Actions",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => {
          return (
            <div>
              <Button
                className={"add-modify-button"}
                onClick={(e) => showBookList(tableMeta.rowData)}
              >
                {" "}
                View Books
              </Button>
            </div>
          );
        },
      },
    },
  ]);
  const [bookCopyColumns] = React.useState([
    {
      name: "book_number",
      label: "Book Number",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "book__title",
      label: "Book Title",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "book__category__name",
      label: <FormattedMessage {...messages.libCategorySelectCategory} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "book__sub_category__name",
      label: <FormattedMessage {...messages.libSubCategorySelectCategory} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "book__publisher__name",
      label: <FormattedMessage {...messages.libPublisher} />,
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "book_number",
      label: "Actions",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => {
          return (
            <div>
              <Tooltip
                title={
                  props?.bookIds.includes(value)
                    ? "Already Book Is Selected"
                    : "You Can Select Book"
                }
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <Button
                  className={
                    props.bookIds.includes(value)
                      ? "add-modify-button opacity-0-5"
                      : "add-modify-button"
                  }
                  onClick={
                    props?.bookIds.includes(value)
                      ? ""
                      : (e) => setID(tableMeta.rowData)
                  }
                >
                  {" "}
                  Add Item
                </Button>
              </Tooltip>
            </div>
          );
        },
      },
    },
  ]);

  React.useEffect(() => {
    getCategoryList();
    getBookList();
    setOpen(true);
  }, []);

  const setID = (value) => {
    let returnValue = {};
    returnValue["book_number"] = value[0];
    returnValue["title"] = value[1];
    returnValue["category_name"] = value[2];
    returnValue["sub_category_name"] = value[3];
    returnValue["publisher_name"] = value[4];
    returnValue["id"] = value[5];
    props.selectedItem(returnValue);
    setOpen(false);
  };

  const showBookList = (value) => {
    let selectedTitle = {};
    selectedTitle["id"] = value[5];
    selectedTitle["title"] = value[0];
    setSelectedTitle(selectedTitle);
    setSelectedTab("book_copy");
  };

  const handleClose = () => {
    setOpen(false);
    props.closeParent();
  };

  const getCategoryList = () => {
    const url = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length == 1) {
          setCategory(response.data.data[0]["id"]);
        } else if (getLibCategory()) {
          let selected=getLibCategory()
          setCategory(selected["id"]);
        }
        setCategoryList(response.data.data);
      }
    });
  };

  const getBookList = (paginationProps) => {
    setTableUpdating(true);
    let url = GET_URL.librarybook.api;
    let currentPagination = pagination;
    if (selectedTab === "book_copy") {
      url = GET_URL.librarybookcopy.api;
      currentPagination = bookPagination;
    }
    if (paginationProps) {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      pagination: true,
    };
    if (subCategory !== "all") {
      params["sub_category"] = subCategory;
    }
    if (category !== "all" && subCategory === "all") {
      params["category"] = category;
    }
    if (selectedTitle["id"]) {
      params["book"] = selectedTitle["id"];
    }
    getRequest(url, params, props).then((response) => {
      setPageLoading(false);
      if (response && response.status === 200) {
        setItemList(response.data.data);
        if (selectedTab === "book_copy") {
          setBookPagination(currentPagination);
        } else {
          setPagination(currentPagination);
        }
        setTableUpdating(false);
        if (response.data.data.length === 0) {
          setBlankData("There is no staffs");
          setItemList(null);
        }
      }
    });
  };

  const onChange = async (e) => {
    let { value, name } = e.target;
    if (value !== 0) {
      if (name === "category") {
        setCategory(value);
        setSubCategory("all");
        setIsSubCategory(false);
        if (value !== "all") {
          getSubCategoryList(value);
        }
      } else if (name === "subCategory") {
        setSubCategory(value);
      }
    }
  };

  useEffect(() => {
    getBookList();
  }, [subCategory]);

  useEffect(() => {
    getBookList();
  }, [category]);

  const getSubCategoryList = (id) => {
    const g_url = GET_URL.librarysubcategory.api;
    const params = { is_active: 1, category: id };
    getRequest(g_url, params, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.unshift({ id: "all", name: "All" });
        setSubCategoryList(response.data.data);
        setIsSubCategory(response.data.data.length > 1 ? true : false);
      }
    });
  };

  const options = {
    selectableRows: "none",
    filterType: "dropdown",
    responsive: "simple",
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
  };

  const handleCloseSnackBar = () => {
    setOpenSnackBar(false);
  };

  const onChangeHandleView = (value) => {
    setSelectedTitle({});
    setSelectedTab(value);
  };

  React.useEffect(() => {
    setItemList({});
    getBookList();
  }, [selectedTab]);

  const handleDeleteTitle = () => {
    setSelectedTitle({});
    setItemList({});
    getBookList();
  };

  return (
    <div>
      <Dialog fullScreen open={open} onClose={handleClose}>
        <AppBar style={{ position: "fixed" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6">Add Book</Typography>
          </Toolbar>
        </AppBar>
        {pageLoading && (
          <Box display="flex">
            <img src={loadingBar} className="loading" alt="loading" />
          </Box>
        )}
        {!pageLoading && (
          <Box className="student-route-table-popup margin-top">
            <Grid container className="align-items-center">
              <Grid item md={3} xs={12} className="margin-top-20">
                <Box className="selected_toggle-outer-div header-align end-flex-prop">
                  <Button
                    className={
                      selectedTab === "title"
                        ? "left_selected"
                        : "right-selected-toggle"
                    }
                    onClick={(e) => onChangeHandleView("title")}
                    disabled={selectedTab === "title"}
                  >
                    <Box
                      className={
                        selectedTab === "title"
                          ? "list-selected-toggle-text"
                          : "grid-selected-toggle-text"
                      }
                    >
                      Title Wise
                    </Box>
                  </Button>
                  <Button
                    className={
                      selectedTab === "book_copy"
                        ? "left_selected"
                        : "right-selected-toggle"
                    }
                    onClick={(e) => onChangeHandleView("book_copy")}
                    disabled={selectedTab === "book_copy"}
                  >
                    <Box
                      className={
                        selectedTab === "book_copy"
                          ? "list-selected-toggle-text"
                          : "grid-selected-toggle-text"
                      }
                    >
                      Books Wise
                    </Box>
                  </Button>
                </Box>
              </Grid>
              <Grid item md={3} xs={12} className="margin-top-20">
                <Dropdown
                  data={categoryList}
                  name="category"
                  style="width-100"
                  value={category}
                  onChange={onChange}
                  label={
                    <FormattedMessage {...messages.libCategorySelectCategory} />
                  }
                  error={fieldError.Category}
                  hideSelect={true}
                  size="small"
                />
              </Grid>
              {isSubCategory && (
                <Grid
                  item
                  md={3}
                  xs={12}
                  className="margin-top-20 padding-left-25"
                >
                  <Dropdown
                    data={subCategoryList}
                    name="subCategory"
                    style="width-100"
                    value={subCategory}
                    onChange={onChange}
                    label={
                      <FormattedMessage
                        {...messages.libSubCategorySelectCategory}
                      />
                    }
                    error={fieldError.subCategory}
                    hideSelect={true}
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
            {selectedTitle["id"] && (
              <div className="mt-5">
                <Chip
                  className="text-capitalize"
                  color="primary"
                  onDelete={handleDeleteTitle}
                  label={selectedTitle["title"]}
                />
              </div>
            )}
            {itemList !== null && (
              <Grid container>
                <Grid item md={12} xs={12}>
                  <Box className="header-align">
                    <AllMUIDataTable
                      key={itemList?.data_list}
                      data={itemList?.data_list}
                      columns={
                        selectedTab === "title" ? titleColumns : bookCopyColumns
                      }
                      options={options}
                      title={
                        tableUpdating ? (
                          <CircularProgress className="white-text" />
                        ) : (
                          ""
                        )
                      }
                      onTableChange={() => getBookList()}
                      serverSide={true}
                      pagination={
                        selectedTab === "title" ? pagination : bookPagination
                      }
                      count={itemList.count}
                    />
                  </Box>
                </Grid>
              </Grid>
            )}
            {!pageLoading && itemList === null && (
              <BlankPagewithIcon data={blankData} />
            )}
          </Box>
        )}
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={openSnackBar}
          autoHideDuration={2000}
          onClose={handleCloseSnackBar}
        >
          <Alert onClose={handleCloseSnackBar} severity="error">
            {errorContent}
          </Alert>
        </Snackbar>
      </Dialog>
    </div>
  );
});

export default AddLibraryBook;
