import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
} from "@material-ui/core";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { Actions } from "Constants/permissions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import ReviewIssueModal from "./Components/ReviewIssueModal";

import { numberRegex } from "Constants/regularExpression";
import {
  isUserHasPermission,
  getFullName,
  validateDate,
  Alert,
  dateFormat,
  numberWithCommas,
  getUrlParam,
} from "Includes/functions";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { minDate } from "Constants";
import AssignStudentItemIssue from "Containers/Library/Components/AssignStudentBookIssue";
import AssignStaffItemIssue from "Containers/Library/Components/AssignStaffBookIssue";
import AddLibraryBook from "Containers/Library/Components/AddLibraryBook";

import _ from "lodash";

const maxDate = new Date();

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

class IssueItems extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      selected_date: new Date(),
      fieldErrors: {},
      selectedFilter: "student",
      data_list: [],
      isOpenReviewIssue: false,
      bookList: [
        {
          id: "",
          book_number: "",
          category: "",
          category_name: "",
          sub_category: "",
          sub_category_name: "",
          unit_price: "",
        },
      ],
      parent_name: "",
      submitDisable: false,
      transaction_id: Date.now(),
      stockItemDetails: {},
      isOpenPaymentModel: false,
      issueUserId: "",
      bookIds: [],
      openSelectItem: false,
    };
    this.studentModalRef = React.createRef();
    this.staffModalRef = React.createRef();
    this.addItemStoreRef = React.createRef();
  }

  componentDidMount() {
    let { bookList } = this.state;
    const {
      book,
      book__category__name,
      book__sub_category__name,
      book__price,
      book__publisher__name,
      book__title,
      book_number,
    } = getUrlParam();
    if (
      book &&
      book__category__name &&
      book__sub_category__name &&
      (book__price || book__price == 0) &&
      book__title &&
      (book_number || book_number == 0)
    ) {
      bookList[0]["id"] = book_number;
      bookList[0]["book_number"] = book_number;
      bookList[0]["category_name"] = book__category__name;
      bookList[0]["title"] = book__title;
      bookList[0]["sub_category_name"] = book__sub_category__name;
      bookList[0]["publisher_name"] = book__publisher__name;
      bookList[0]["unit_price"] = book__price;
    }
    this.setState({
      bookList,
      fieldErrors: {},
    });
    this.getStaffList();
  }

  getStaffList = () => {
    const url = GET_URL.staff.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          staffList: response.data.data,
          loading: false,
        });
      }
    });
  };

  onChangeDate = (e) => {
    const { fieldErrors } = this.state;
    delete fieldErrors["selected_date"];
    this.setState({
      selected_date: e,
      fieldErrors,
    });
  };

  onChangeFilter = (value) => {
    const { data_list } = this.state;
    if (data_list.length > 0) {
      Swal.fire({
        title: `<strong>Are you sure want to change ?</strong>`,
        text: "Added list will be removed",
        type: "info",
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "OK",
        cancelButtonText: "Cancel",
        confirmButtonColor: "green",
        cancelButtonColor: "orange",
      }).then((result) => {
        if (result.value) {
          this.setState({
            selectedFilter: value,
            data_list: [],
          });
        }
      });
    } else {
      this.setState({
        selectedFilter: value,
        data_list: [],
      });
    }
  };

  handleOpen = () => {
    const { selectedFilter } = this.state;
    if (selectedFilter == "student") {
      this.studentModalRef.current.openModal();
    } else if (selectedFilter == "staff") {
      this.staffModalRef.current.openModal();
    }
  };

  addDataToList = (new_list) => {
    this.setState({
      data_list: [...new_list],
    });
  };

  openItemList = (itemIndex) => {
    this.setState({
      itemIndex,
      openSelectItem: true,
    });
  };

  selectedItem = (selectedItem) => {
    let { bookList, itemIndex } = this.state;
    bookList[itemIndex]["id"] = selectedItem.id;
    bookList[itemIndex]["book_number"] = selectedItem.book_number;
    bookList[itemIndex]["category_name"] = selectedItem.category_name;
    bookList[itemIndex]["sub_category_name"] = selectedItem.sub_category_name;
    bookList[itemIndex]["title"] = selectedItem.title;
    bookList[itemIndex]["publisher_name"] = selectedItem.publisher_name;
    bookList[itemIndex]["unit_price"] = selectedItem.current_selling_price;
    let bookIds = [];
    bookList.map((data) => {
      if (data["book_number"]) {
        bookIds.push(data["book_number"]);
      }
    });
    this.setState({
      bookList,
      bookIds,
      fieldErrors: {},
      openSelectItem: false
    });
  };

  validateDuplicate = () => {
    let { fieldErrors, bookList, alertData } = this.state;
    let returnValue = true;
    let returnItemDetails = [];
    alertData = "Clear Error(s)";
    for (let pIndex = 0; pIndex < bookList.length; pIndex++) {
      let temp = {};
      for (let cIndex = 0; cIndex < bookList.length; cIndex++) {
        if (
          bookList[pIndex].item === bookList[cIndex].item &&
          pIndex !== cIndex &&
          isEqual(
            bookList[pIndex].property_value,
            bookList[cIndex].property_value
          )
        ) {
          fieldErrors[`item${pIndex}`] = (
            <FormattedMessage {...commonMessages.duplicateFoundLabel} />
          );
          returnValue = false;
          alertData = (
            <FormattedMessage {...commonMessages.duplicateFoundLabel} />
          );
        }
      }
      if (!bookList[pIndex].book_number) {
        fieldErrors[`item${pIndex}`] = (
          <FormattedMessage {...commonMessages.enterValue} />
        );
        returnValue = false;
        alertData = "Please Select Item";
      }
      temp["sub_category"] = bookList[pIndex].sub_category;
      temp["category"] = bookList[pIndex].category;
      temp["property_value"] = bookList[pIndex].property_value;
      temp["item"] = bookList[pIndex].item;
      returnItemDetails.push(temp);
    }
    this.setState({
      fieldErrors,
      alertData,
      openError: returnValue === false ? true : false,
    });
    if (returnValue) {
      returnValue = returnItemDetails;
    }
    return returnValue;
  };

  handleAddProperty = () => {
    let { fieldErrors, bookList } = this.state;
    let validate = this.validateDuplicate();
    if (validate) {
      let temp = {
        item: "",
        category: "",
        sub_category: "",
        unit_price: "",
        amount: "",
      };
      bookList.push(temp);
      this.setState({
        bookList,
        fieldErrors,
      });
    }
  };

  onChangeFieldValue = (e, index) => {
    let { bookList, fieldErrors } = this.state;
    let { name, value } = e.target;
    bookList[index][name] = value;
    if (!numberRegex.value.test(value)) {
      fieldErrors[`${name}${index}`] = "Invalid Number";
    } else {
      fieldErrors[`${name}${index}`] = "";
    }
    this.setState({
      bookList,
      fieldErrors,
    });
  };

  handleDeleteProperty = (index) => {
    let { fieldErrors, bookList } = this.state;
    bookList.splice(index, 1);
    fieldErrors = {};
    this.setState({
      bookList,
      fieldErrors,
    });
  };

  getbookList = () => {
    const { fieldErrors, bookList } = this.state;
    return (
      <TableContainer component={Paper} className="header-align">
        <Table aria-label="simple table">
          <TableHead className="table-header-color">
            <TableRow>
              <TableCell className="padding-0 text-align-web-center">
                Book Number
              </TableCell>
              <TableCell className="padding-0 text-align-web-center">
                Category - Sub Category
              </TableCell>
              <TableCell className="padding-0 text-align-web-center">
                Publisher
              </TableCell>
              <TableCell className="padding-0 text-align-web-center">
                Cateloag No.
              </TableCell>
              {(bookList.length > 1 || bookList?.[0]?.book_number) && (
                <TableCell className="padding-0 text-align-web-center">
                  Delete
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {bookList.map((row, index) => (
              <TableRow>
                <TableCell className="padding-0 text-align-web-center">
                  {!row.book_number && (
                    <Button
                      className="form-next-pre-button mt-10"
                      onClick={() => this.openItemList(index)}
                    >
                      {" "}
                      Select Item{" "}
                    </Button>
                  )}
                  {row.book_number && (
                    <Box className="flex-justify-space-between max-width">
                      <Box
                        className={
                          fieldErrors[`item${index}`] ? "red-text" : ""
                        }
                      >
                        {row.book_number}
                      </Box>
                    </Box>
                  )}
                </TableCell>
                <TableCell className="padding-0 text-align-web-center">
                  {row.sub_category_name
                    ? `${row?.category_name} - ${row?.sub_category_name}`
                    : row?.category_name}
                </TableCell>
                <TableCell className="padding-0 text-align-web-center">
                  {row.book__publisher__name}
                </TableCell>
                <TableCell>{}</TableCell>
                {(bookList.length > 1 || row.book_number) && (
                  <TableCell className="padding-0 text-align-web-center">
                    <Button color="secondary" className="min-max-w-0">
                      <DeleteOutlineIcon
                        onClick={() => this.handleDeleteProperty(index)}
                        className="add-icon-stock-item"
                      />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box className="float-right p-r-20px">
          <Tooltip
            title={"Add Another Item"}
            enterDelay={400}
            enterNextDelay={400}
            placement="top-start"
            classes={{ tooltip: "tooltip-show-data" }}
          >
            <Button
              color="primary"
              className="min-max-w-0"
              onClick={() => this.handleAddProperty()}
            >
              <AddCircleOutlineIcon className="add-icon-stock-item" /> Add Item
            </Button>
          </Tooltip>
        </Box>
      </TableContainer>
    );
  };

  onBlurValidation = (e) => {
    const { fieldErrors, selected_date } = this.state;
    let returnValue = true;
    let error = "";
    if (selected_date === null) {
      error = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
    } else {
      error = validateDate(selected_date, minDate, maxDate);
    }
    if (error !== "") {
      returnValue = false;
      fieldErrors["selected_date"] = error;
      this.setState({ fieldErrors });
    }
    return returnValue;
  };

  handleChange = (e) => {
    const { name, value } = e.target;
    const { fieldErrors } = this.state;
    delete fieldErrors[name];
    this.setState({
      [name]: value,
      fieldErrors,
    });
  };

  removeData = (index) => {
    let { data_list } = this.state;
    data_list.splice(index, 1);
    this.setState({
      data_list,
    });
  };

  validateAndGetPostdata = () => {
    let {
      selected_date,
      data_list,
      bookList,
      selectedFilter,
      fieldErrors,
      transaction_id,
      issueUserId,
    } = this.state;
    let returnValue = true;
    let return_error = "";
    if (!selected_date) {
      fieldErrors["selected_date"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnValue = false;
    } else if (selected_date) {
      returnValue = this.onBlurValidation();
    }
    if (bookList.length == 0) {
      return_error = "Select atleast one stock item";
      returnValue = false;
    }
    if (data_list.length == 0) {
      return_error = `Select atleast one ${selectedFilter}`;
      returnValue = false;
    }
    let stock_list = [];
    let post_list = [];
    let stock_temp = {};
    bookList.every((stock) => {
      if (!stock.book_number) {
        returnValue = false;
        return_error = `Select atleast one book`;
        return false;
      }
      stock_temp = {};
      stock_temp["stock"] = stock.id;
      stock_temp["unit_price"] = parseInt(stock.unit_price);
      stock_list.push(stock_temp);
    });
    if (selectedFilter !== "parent") {
      for (const data of data_list) {
        post_list.push({
          user: data["user_id"],
          transaction_id: `${data["user_id"]}_${transaction_id}`,
        });
      }
      issueUserId = post_list[0]["user"];
    }
    this.setState({
      fieldErrors,
      openError: return_error ? return_error : false,
      alertData: return_error,
      issueUserId,
    });
    if (returnValue) {
      returnValue = {
        issue_list: [],
        transaction_id: transaction_id,
      };
      bookList.map((book) => {
        returnValue["issue_list"].push({
          book_copy: book.id,
          issued_to_user: issueUserId,
        });
      });
    }
    return returnValue;
  };

  handlePostRequest = (post_data) => {
    this.setState({ submitDisable: true });
    let url = POST_URL.issuereturnbook.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.library_issue_book.view.url);
      }
      this.setState({ submitDisable: false, isOpenPaymentModel: false });
    });
  };

  handleClose = () => {
    this.setState({
      openError: false,
    });
  };

  getAmount = (index) => {
    const { bookList } = this.state;
    let total = "";
    if (
      bookList[index].quantity &&
      bookList[index].unit_price &&
      parseInt(bookList[index].quantity) > 0 &&
      parseInt(bookList[index].unit_price) > 0
    ) {
      total =
        parseInt(bookList[index].quantity) *
        parseInt(bookList[index].unit_price);
    }

    return total;
  };

  getTotalAmount = () => {
    const { bookList } = this.state;
    let total = 0;
    for (let index = 0; index < bookList.length; index++) {
      if (parseInt(this.getAmount(index))) {
        total = parseInt(this.getAmount(index)) + parseInt(total);
      }
    }
    return total;
  };

  getGrandTotal = () => {
    let { stockItemDetails } = this.state;
    let tax = stockItemDetails["tax"] ? stockItemDetails["tax"] : 0;
    let discount = stockItemDetails["discount"]
      ? stockItemDetails["discount"]
      : 0;
    let total = "";
    if (parseInt(tax) >= 0 && parseInt(discount) >= 0) {
      total = this.getTotalAmount();
      total = parseInt(parseInt(total) + parseInt(tax)) - parseInt(discount);
    }
    return total;
  };

  updateStockItemDetails = (name, value) => {
    let { stockItemDetails } = this.state;
    stockItemDetails[name] = value;
    this.setState({
      stockItemDetails,
    });
  };

  getAllStudentsTotalAmount = () => {
    const { data_list } = this.state;
    let total = this.getTotalAmount();
    return total * data_list.length;
  };

  closeFeePaymentModal = () => {
    this.setState({ isOpenPaymentModel: false, submitDisable: false });
  };

  handleReviewIssue = () => {
    if (!this.state.isOpenReviewIssue) {
      let post_data = this.validateAndGetPostdata();
      if (post_data) {
        this.setState({
          post_data: post_data,
          isOpenReviewIssue: !this.state.isOpenReviewIssue,
        });
      }
    } else {
      this.setState({
        isOpenReviewIssue: !this.state.isOpenReviewIssue,
      });
      // if (!post_data) return false;
      // this.handlePostRequest(post_data);
    }
  };

  closeParent=()=>{
    this.setState({
      openSelectItem: false
    })
  }

  render() {
    const {
      loading,
      selected_date,
      fieldErrors,
      selectedFilter,
      data_list,
      issueUserId,
      staffList,
      submitDisable,
      openError,
      alertData,
      isOpenReviewIssue,
      post_data,
      openSelectItem,
      bookIds,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">
                  {Actions.library_issue_book.create.label}
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.library_issue_book.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />
                    {Actions.library_issue_book.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item md={9} xs={12}>
                <Paper className="paper-plain-bacground m-t-20px p-20px">
                  <Grid container>
                    <Grid item md={4} xs={12}>
                      <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        <KeyboardDatePicker
                          autoOk
                          variant="inline"
                          inputVariant="outlined"
                          label={<FormattedMessage {...commonMessages.date} />}
                          required={true}
                          fullWidth
                          name="selected_date"
                          minDate={minDate}
                          maxDate={maxDate}
                          onBlur={(e) => this.onBlurValidation(e)}
                          InputLabelProps={{
                            shrink: selected_date ? true : false,
                          }}
                          format="dd-MM-yyyy"
                          value={selected_date}
                          onChange={(e) => this.onChangeDate(e)}
                          KeyboardButtonProps={{
                            "aria-label": "change date",
                          }}
                          helperText={
                            !fieldErrors.selected_date
                              ? "Format DD-MM-YYYY"
                              : fieldErrors.selected_date
                          }
                          error={
                            fieldErrors.selected_date &&
                            (fieldErrors.selected_date ? true : false)
                          }
                        />
                      </MuiPickersUtilsProvider>
                    </Grid>
                  </Grid>
                  {this.getbookList()}
                </Paper>
              </Grid>
              <Grid item md={3} xs={12}>
                <Paper className="paper-plain-bacground m-t-20px p-t-20px  p-b-20px">
                  <Box className="result-section-view-filter-outer-box">
                    <label
                      className="cursor-pointer"
                      onChange={() => this.onChangeFilter("student")}
                    >
                      <input
                        type="radio"
                        value="student"
                        name="selectedFilter"
                        checked={selectedFilter == "student"}
                        defaultChecked={selectedFilter == "student"}
                      />{" "}
                      Student
                    </label>
                    <label
                      className="cursor-pointer"
                      onChange={() => this.onChangeFilter("staff")}
                    >
                      <input
                        type="radio"
                        value="staff"
                        name="selectedFilter"
                        checked={selectedFilter == "staff"}
                        defaultChecked={selectedFilter == "staff"}
                      />{" "}
                      Staff
                    </label>
                  </Box>
                  <Box className="p-t-20px p-l-20px">
                    <Button
                      className="custom-button"
                      onClick={() => this.handleOpen()}
                    >
                      {data_list.length === 1
                        ? `Change ${selectedFilter}`
                        : `Add ${selectedFilter}`}
                    </Button>
                  </Box>
                  {data_list.length > 0 && (
                    <table width="100%" className="selectable-row-table mt-20">
                      <thead className="table-select-hostel-thead">
                        <th className={`selectable-table-head`}>
                          Student Name
                        </th>
                        <th className={`selectable-table-head`}> Details </th>
                      </thead>
                      <tbody className="selectable-row-table-body">
                        {data_list.length > 0 &&
                          data_list.map((data, index) => {
                            return (
                              <tr
                                key={index}
                                className={"selectable-row-table-row"}
                              >
                                <td className={"textAlign pl-15 "}>
                                  {getFullName(
                                    data.first_name,
                                    data.middle_name,
                                    data.last_name
                                  )}
                                </td>
                                <td className={"textAlign pl-15 "}>
                                  {`${data.current_standard_name} [${data.current_standard_section_name}]`}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          <AssignStudentItemIssue
            ref={this.studentModalRef}
            addDataToList={this.addDataToList}
          />
          <AssignStaffItemIssue
            ref={this.staffModalRef}
            addDataToList={this.addDataToList}
            staffList={staffList}
          />

          {openSelectItem && (
            <AddLibraryBook
              selectedItem={this.selectedItem}
              bookIds={bookIds}
              closeParent={this.closeParent}
            />
          )}

          {isOpenReviewIssue && (
            <ReviewIssueModal
              issueUserId={issueUserId}
              closeInParent={this.handleReviewIssue}
              post_data={post_data}
            />
          )}

          <Box className="submt-button-float-bottom" mt={3}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.handleReviewIssue}
            >
              <FormattedMessage {...commonMessages.submit} />
            </Button>
          </Box>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openError}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Box>
      );
    }
  }
}
export default withRouter(IssueItems);
