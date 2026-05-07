import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  Chip,
} from "@material-ui/core";
import { Link } from "react-router-dom";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { withRouter } from "react-router-dom";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { GET_URL, DEL_URL } from "Includes/urls";
import {
  isUserHasPermission,
  getPaginationProps,
  updatePermissions,
  numberWithCommas,
  getFormatMessage,
  dateFormat,
  setLibCategory,
  getLibCategory,
} from "Includes/functions";
import classNames from "classnames";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import { Tooltip } from "@material-ui/core";
import StudentListActions from "Includes/StudentListActions";
import commonMessages from "Constants/messages";
import Swal from "sweetalert2";
import "./styles.scss";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import BarCodeDialog from "./Components/BarCodeDialog";
import ErrorHandler from "Components/ErrorHandler";
import JsBarcode from "jsbarcode";

class ListBooks extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("library_books", ["update", "delete"]);
    this.state = {
      categoryList: [],
      subCategoryList: [],
      selectedCategory: "",
      selectedSubCategory: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      stockList: { data_list: [] },
      error: "",
      loading: true,
      closeMenu: true,
      tableUpdating: false,
      errorContent: "",
      enabledActions: [],
      selectedTab: "title",
      selectedBook: "",
      selectedBookName: "",
      selectedId: "",
      number_of_hites: 40,
      isBarCodeOpen: false,
      titleColumns: [
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
          name: "title",
          label: "Book Title",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "category__name",
          label: <FormattedMessage {...messages.libCategorySelectCategory} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "sub_category__name",
          label: (
            <FormattedMessage {...messages.libSubCategorySelectCategory} />
          ),
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
          name: "price",
          label: "Price",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            download: false,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteBookItem}
                    editURL={Actions.library_books.update.url}
                    viewURL={Actions.library_books.view.url}
                    enabledActions={[...["viewBooks"], ...this.permission]}
                    handleActive={this.handleActive}
                  />
                </div>
              );
            },
          },
        },
      ],
      bookCopyColumns: [
        {
          name: "book_number",
          label: "Book Number",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "bar_code",
          label: "Bar Code",
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
          label: (
            <FormattedMessage {...messages.libSubCategorySelectCategory} />
          ),
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
          name: "book__price",
          label: "Price",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            download: false,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteBookItem}
                    editURL={Actions.library_books.update.url}
                    viewURL={Actions.library_books.view.url}
                    enabledActions={[...["issue", "return", "barcode"]]}
                    handleActive={this.handleActive}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  handleActive = (id, index, action) => {
    let bookInfo = this.state.stockList["data_list"][index];
    if (action === "issue" || action === "return" || action === "renew") {
      let book_info = {
        book: bookInfo.book_number,
      };
      let searchParam = "?" + new URLSearchParams(book_info).toString();
      this.props.history.push({
        pathname: Actions.library_issue_book.create.url,
        search: searchParam,
      });
    } else if (action === "viewBooks") {
      this.setState(
        {
          selectedTab: "book_copy",
          selectedBook: bookInfo.id,
          selectedBookName: bookInfo.title,
          stockList: {},
        },
        () => {
          this.getBookList();
        }
      );
    } else if (action === "barcode") {
      this.setState({
        isBarCodeOpen: true,
        selectedId: id,
      });
    }
  };

  deleteBookItem = (id, index) => {
    this.setState({ tableUpdating: true });
    let { stockList, columns, selectedTab } = this.state;
    let url = DEL_URL.librarybook.api + id + "/";
    if (selectedTab === "book_copy") {
      url = DEL_URL.librarybookcopy.api + id + "/";
    }
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        stockList.data_list.splice(index, 1);
        this.setState({
          stockList,
          columns: [...columns],
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  componentDidMount() {
    this.getCategoryList();
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
            loading: false,
            selectedCategory: selectedCategory,
          },
          () => {
            if (getLibCategory()) {
              this.getSubCategoryList(selectedCategory["id"]);
              this.getBookList();
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

  getBookList = (paginationProps) => {
    let {
      selectedSubCategory,
      selectedCategory,
      pagination,
      selectedTab,
      selectedBook,
      subCategoryList,
    } = this.state;
    this.setState({ tableUpdating: true });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let url = GET_URL.librarybook.api;
    if (selectedTab === "book_copy") {
      url = GET_URL.librarybookcopy.api;
    }
    let params = { ...pagination_params, is_active: true };
    if (selectedSubCategory && selectedSubCategory["id"] !== "all") {
      params["sub_category"] = selectedSubCategory["id"];
    }
    if (selectedCategory && selectedCategory["id"] !== "all") {
      params["category"] = selectedCategory["id"];
    }
    if (selectedBook) {
      params["book"] = selectedBook;
    }
    let prop = { ...this.props };
    let transaction_id = Date.now();
    if (paginationProps === "download") {
      params["long_running_process"] = 1;
      params['transaction_id'] = transaction_id
      params['download_data'] = true
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
          this.setState({
            stockList: response.data.data,
            tableUpdating: false,
            loading: false,
            pagination: this.currentPagination
              ? this.currentPagination
              : this.state.pagination,
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
    let { number_of_hites } = this.state;
    let newstockList = this.state.stockList;
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
                stockList: { ...newstockList },
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
              stockList: { ...newstockList },
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

  onChangeHandleView = (value) => {
    this.setState(
      {
        selectedTab: value,
        stockList: {},
        selectedBook: "",
        selectedBookName: "",
      },
      () => {
        this.getBookList();
      }
    );
  };

  handleDelete = () => {
    this.setState(
      {
        stockList: {},
        selectedBook: "",
        selectedBookName: "",
      },
      () => {
        this.getBookList();
      }
    );
  };

  handleDropDownSearch = (value, name) => {
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getBookList();
        if (name === "selectedCategory") {
          setLibCategory(value);
          this.getSubCategoryList(value["id"]);
        }
      }
    );
  };

  closeModal = () => {
    this.setState({
      isBarCodeOpen: false,
    });
  };

  generateAndPrintBarCodes = () => {
    const { stockList } = this.state;
  
    if (!stockList?.data_list?.length) {
      Swal.fire({
        icon: "info",
        title: "No Barcodes Found",
        text: "There are no barcode numbers to print.",
      });
      return;
    }
  
    // Create a new blank window for printing
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Book Barcodes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
            }
            h2 {
              text-align: center;
              margin-bottom: 30px;
            }
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .barcode-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 25px;
              width: 300px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
              page-break-inside: avoid;
            }
            svg {
              display: block;
              width: 260px;
              height: 90px;
              margin-top: 10px;
            }
            .book-title {
              font-size: 14px;
              font-weight: bold;
              margin-top: 8px;
              line-height: 1.2;
            }
            .book-info {
              font-size: 12px;
              color: #333;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
              }
              .barcode-item {
                margin-bottom: 40px;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <h2>Book Barcode Sheet</h2>
          <div class="barcode-container" id="barcode-container"></div>
        </body>
      </html>
    `);
    printWindow.document.close();
  
    // Wait for new window to load content
    printWindow.onload = () => {
      const container = printWindow.document.getElementById("barcode-container");
  
      stockList.data_list.forEach((item, index) => {
        const barcodeValue = item.bar_code || `BOOK-${index + 1}`;
        const title = item.book__title || "Untitled";
  
        // Create a barcode box
        const div = printWindow.document.createElement("div");
        div.classList.add("barcode-item");
  
        // Add book info text
        const info = printWindow.document.createElement("div");
        info.classList.add("book-info");
        info.innerHTML = `
          <strong>${title}</strong><br/>
          Book No: ${item.book_number || "-"}<br/>
          Barcode: ${barcodeValue}
        `;
        div.appendChild(info);
  
        // Create SVG for JsBarcode
        const svg = printWindow.document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.id = `barcode-${index}`;
        div.appendChild(svg);
  
        // Append to container
        container.appendChild(div);
  
        // Generate barcode
        JsBarcode(svg, barcodeValue, {
          format: "CODE128",
          displayValue: false,
          lineColor: "#000",
          width: 2,
          height: 70,
          margin: 5,
        });
      });
  
      // Print after barcode generation
      setTimeout(() => {
        printWindow.print();
      }, 800);
    };
  };
  

  render() {
    let {
      stockList,
      loading,
      tableUpdating,
      titleColumns,
      bookCopyColumns,
      categoryList,
      selectedCategory,
      error,
      subCategoryList,
      selectedSubCategory,
      pagination,
      selectedTab,
      selectedBookName,
      isBarCodeOpen,
      selectedId,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      onDownload: () => {
        return this.getBookList("download");
      },
      // onDownload: (buildHead, buildBody, columns, data) => {
      //   columns.forEach((column_name) => {
      //     column_name.label = getFormatMessage(column_name.label);
      //   });
      //   return "\uFEFF" + buildHead(columns) + buildBody(data);
      // },
      // downloadOptions: {
      //   filename: `Store_Items_${dateFormat(
      //     new Date(),
      //     "DD-MM-YYYY hh:mm A"
      //   )}.csv`,
      //   filterOptions: {
      //     useDisplayedColumnsOnly: true,
      //     useDisplayedRowsOnly: true,
      //   },
      // },
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
                  <FormattedMessage {...messages.libBooks} />
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                {isUserHasPermission("library_books", "create") && (
                  <Box className="header-align end-flex-prop">
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.library_books.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                      {Actions.library_books.create.label}
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
            <Grid container>
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
                  error={error[`selectedCategory`] && error[`selectedCategory`]}
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
                      error[`selectedSubCategory`] &&
                      error[`selectedSubCategory`]
                    }
                  />
                )}
              </Grid>
              <Grid item md={6} xs={12} className="margin-top-20 end-flex-prop">
                <Box className="selected_toggle-outer-div header-align ">
                  <Button
                    className={
                      selectedTab === "title"
                        ? "left_selected"
                        : "right-selected-toggle"
                    }
                    onClick={(e) => this.onChangeHandleView("title")}
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
                    onClick={(e) => this.onChangeHandleView("book_copy")}
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
                {selectedTab === "book_copy" && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.generateAndPrintBarCodes}
                    style={{ marginLeft: "15px", backgroundColor: "#1976d2", color: "#fff" }}
                  >
                    Print Barcodes
                  </Button>
                )}
              </Grid>
            </Grid>
            {selectedBookName && (
              <div className="mt-5">
                <Chip
                  className="text-capitalize"
                  color="primary"
                  onDelete={this.handleDelete}
                  label={selectedBookName}
                />
              </div>
            )}
            {!selectedCategory ? (
              <BlankPagewithIcon data={"Select Category To Issue Book"} />
            ) : (
              <Paper>
                <AllMUIDataTable
                  title={
                    tableUpdating ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                  key={stockList.data_list}
                  data={stockList.data_list}
                  columns={
                    selectedTab === "title" ? titleColumns : bookCopyColumns
                  }
                  options={options}
                  onTableChange={this.getBookList}
                  serverSide={true}
                  pagination={pagination}
                  count={stockList.count}
                />
              </Paper>
            )}
            {isBarCodeOpen && (
              <BarCodeDialog
                selectedId={selectedId}
                closeModal={this.closeModal}
              />
            )}
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(ListBooks);
