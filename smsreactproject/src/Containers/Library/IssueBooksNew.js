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
  TextField,
  Avatar,
} from "@material-ui/core";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import { Actions } from "Constants/permissions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import ReviewIssueModal from "./Components/ReviewIssueModal";
import book_logo from "images/book.png";
import role from "images/role.png";
import { numberRegex } from "Constants/regularExpression";
import DropDownWithSearchApi from "Components/DropDownWithSearchApi";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

import {
  validateDate,
  Alert,
  dateFormat,
  numberWithCommas,
  getUrlParam,
  printPDF,
  getCommaSeperatedArrayOfObjects,
  setLibCategory,
  getLibCategory,
  setIssueBookSearchType,
  getIssueBookSearchType,
} from "Includes/functions";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { minDate } from "Constants";
import AddLibraryBook from "Containers/Library/Components/AddLibraryBook";
import _ from "lodash";
import PaymentModal from "Components/PaymentModalNew";
import Checkbox from "@material-ui/core/Checkbox";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import DropDownWithSearchApiStaff from "Components/DropDownWithSearchApiStaff";

const maxDate = new Date();

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

class IssueBooksNew extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      selected_date: new Date(),
      autoFocusStudent: false,
      autoFocusBook: true,
      autoFocusBarcode: false,
      fieldErrors: {},
      selectedFilter: "student",
      data_list: [],
      isOpenReviewIssue: false,
      book_status: [],
      bookList: [],
      parent_name: "",
      submitDisable: false,
      transaction_id: Date.now(),
      stockItemDetails: {},
      isOpenPaymentModel: false,
      issueUserId: "",
      bookIds: [],
      searchField: { book: "" },
      book_details: null,
      user_details: null,
      fieldErrors: {},
      isOpenReturnModal: false,
      book_action: "",
      isOpenPaymentModal: false,
      paymentDetails: { amount: 0 },
      payment_details: {},
      payment_review_deatils: {},
      isOpenPaymentModal: false,
      selected_status: "",
      isIssueBookItem: false,
      isRenewBookItem: false,
      skipPayment: false,
      search_fields: "user_student__barcode_number",
      allow_to_edit_fine_amount: isFormDefinitionEnabled(
        "library_configuration",
        "allow_to_edit_fine_amount",
        1
      ),
      selectedCategory: null,
      categoryList: [],
    };
    this.studentModalRef = React.createRef();
    this.staffModalRef = React.createRef();
    this.addItemStoreRef = React.createRef();
    this.inputRef = React.createRef();
    this.inputRefBarcode = React.createRef();
    /** Direct ref to the book number input for reliable focus after modals/Swal */
    this.bookInputRef = React.createRef();
  }

  componentDidMount() {
    let { bookList, searchField, search_fields } = this.state;
    this.getCategoryList();
    const { book } = getUrlParam();
    if (book) {
      searchField["book"] = book;
      this.setState(
        {
          searchField,
        },
        () => {
          this.searchBook();
        }
      );
    }
    if (getIssueBookSearchType()) {
      search_fields = getIssueBookSearchType();
    }
    this.setState({
      bookList,
      fieldErrors: {},
      search_fields,
    });
    window.addEventListener("keydown", this.handleGlobalKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleGlobalKeyDown);
  }

  getCategoryList = () => {
    let { selectedCategory } = this.state;
    const url = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length == 1) {
          selectedCategory = response.data.data[0];
        } else if (getLibCategory()) {
          selectedCategory = getLibCategory();
        }
        this.setState({
          categoryList: response.data.data,
          selectedCategory: selectedCategory,
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

  handleDropDownSearch = (value) => {
    setLibCategory(value);
    this.setState({
      selectedCategory: value,
    });
  };

  getbookList = () => {
    const { book_details, book_status, user_details } = this.state;
    return (
      <>
        {book_details ? (
          <>
            <h4 className="table-heading">Book Details</h4>
            <TableContainer component={Paper} className="header-align mt-20">
              <Table aria-label="simple table">
                <TableBody>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Book Number
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book_number}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Book Status
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book_status}
                    </TableCell>
                  </TableRow>
                  {book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Issued On
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {book_details.issued_on
                          ? dateFormat(
                            book_details.issued_on,
                            "DD-MM-YYYY hh:mm A"
                          )
                          : ""}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Renew Date
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details?.renew_date
                        ? dateFormat(
                          book_details?.renew_date,
                          "DD-MM-YYYY hh:mm A"
                        )
                        : "-"}
                    </TableCell>
                  </TableRow>
                  {book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Issued To User
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {book_details.user_details?.is_staff ? user_details?.staff_details?.name : user_details?.student_details?.name}
                      </TableCell>
                    </TableRow>
                  )}
                  {book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Due Date
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50">
                        {book_details.due_date
                          ? dateFormat(
                            book_details.due_date,
                            "DD-MM-YYYY hh:mm A"
                          )
                          : "-"}
                      </TableCell>
                    </TableRow>
                  )}
                  {book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Fine Amount
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {numberWithCommas(
                          book_details.fine_details?.fine_amount ?? 0
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Title
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book__title}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Category (Sub Category)
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {!!book_details?.book__sub_category__name
                        ? `${book_details.book__category__name} (${book_details?.book__sub_category__name} )`
                        : book_details.book__category__name}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Author
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.author_datas
                        ? getCommaSeperatedArrayOfObjects(
                          book_details.
                            author_datas,
                          "name"
                        )
                        : ""}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Publisher
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book__publisher__name}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <div className="mt-30 mb-20 text-align-center">
            <img src={book_logo} className="width-height-150px" />
          </div>
        )}
      </>
    );
  };

  getUserList = () => {
    const { user_details } = this.state;
    let profile_url = user_details?.staff_details
      ? user_details?.staff_details?.profile_pic_details?.file
      : user_details?.student_details?.profile_pic_details?.file;
    return (
      <>
        {user_details && (
          <Avatar
            src={profile_url}
            alt="Preview"
            className="height-width-120px "
          />
        )}
        {user_details ? (
          <>
            <h4 className="table-heading">
              {user_details.staff_details ? "Staff Details" : "Student Details"}
            </h4>
            {user_details.staff_details ? (
              <TableContainer component={Paper} className="header-align mt-20">
                <Table aria-label="simple table">
                  <TableBody>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Staff Name
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.staff_details?.name}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Mobile Number
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.staff_details?.mobile_num}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Group Name
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.staff_details?.designation}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Number Of Books Hold
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details.assigned_books.length}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Fine Amount
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {numberWithCommas(user_details.total_fine_amount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <TableContainer component={Paper} className="header-align mt-20">
                <Table aria-label="simple table">
                  <TableBody>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Student Name
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.student_details?.name}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Mobile Number
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.student_details?.mobile_num}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Standard
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.student_details?.standard_name}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Section
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details?.student_details?.section_name}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Number Of Books Hold
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {user_details.assigned_books.length}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Fine Amount
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {numberWithCommas(user_details.total_fine_amount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : (
          <div className="mt-30 mb-20 text-align-center">
            <img src={role} className="width-height-150px" />
          </div>
        )}
      </>
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
    setIssueBookSearchType(value);
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

  validateAndGetPostdata = (book_status) => {
    let {
      book_details,
      fieldErrors,
      transaction_id,
      issueUserId,
      user_details,
      payment_details,
    } = this.state;
    let returnValue = true;
    let return_error = "";
    if (!book_details) {
      return_error = "Select atleast one stock item";
      returnValue = false;
    }
    let post_list = [];
    post_list.push({
      user: user_details["id"],
      transaction_id: `${user_details["id"]}_${transaction_id}`,
    });
    issueUserId = user_details.id
    this.setState({
      fieldErrors,
      openError: return_error ? return_error : false,
      alertData: return_error,
      issueUserId: issueUserId,
      selected_status: book_status,
    });
    if (returnValue) {
      if (book_status === "ISSUE") {
        returnValue = {
          issue_list: [],
          transaction_id: transaction_id,
        };
        returnValue["issue_list"].push({
          book_copy: book_details.id,
          issued_to_user: issueUserId,
        });
      } else if (book_status === "RETURN") {
        returnValue = {
          return_list: [],
          transaction_id: transaction_id,
          payment_details: payment_details,
        };
        returnValue["return_list"].push({
          issuereturnbook_id: parseInt(book_details.issue_return_id),
          fine_amount: payment_details?.total_amount ? parseFloat(payment_details.total_amount) : 0,
          remark_on_return: payment_details?.payment_note ?? null,
          is_exempted: payment_details.is_exempted,
          reason_id: payment_details.reason_id,
          issued_to_user: issueUserId
        });
      } else if (book_status === "RENEW") {
        returnValue = {
          issue_return_datas: [],
          transaction_id: transaction_id,
          payment_details: payment_details,
        };
        returnValue["issue_return_datas"].push({
          issue_return_book_id: book_details.issue_return_id,
          // fine_amount: 0,
          remark_on_return: "",
          carry_forward_fine_amount: book_details.fine_amount,
          number_of_minutes_from_due_date: book_details.fine_fine_minutes,
        });
      }
    }
    return returnValue;
  };

  handlePostRequest = (post_data, status, is_payment_done) => {
    const { user_details } = this.state;
    this.setState({ submitDisable: true });
    let url = POST_URL.issuereturnbook.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        let shouldPrintReceipt = false;
        if (
          status === "RETURN" &&
          is_payment_done &&
          response?.data?.payment_detail_id
        ) {
          let props = { ...this.props };
          props.title = `Fine Fees collected for ${user_details?.student_details?.name}`;
          props.url =
            GET_URL.libraryfine.api + response?.data?.payment_detail_id + "/";
          printPDF(props);
          shouldPrintReceipt = true;
        }
        if (status === "RENEW" && response?.data?.payment_detail_id) {
          let props = { ...this.props };
          props.title = `Renewal Receipt for ${user_details?.student_details?.name}`;
          props.url = GET_URL.libraryfine.api + response?.data?.payment_detail_id + "/";
          printPDF(props);
          shouldPrintReceipt = true;
        }
        // Wait until success toast closes before focusing — otherwise focus runs behind Swal and is lost
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          this.setState(
            {
              book_details: null,
              submitDisable: false,
              isOpenPaymentModel: false,
              book_status: [],
              payment_details: {},
            },
            () => {
              if (user_details?.id) {
                this.onStudentChange({
                  user_id: user_details.id,
                });
              }
              if (shouldPrintReceipt) {
                setTimeout(() => this.focusSearchBookInput(), 400);
                setTimeout(() => this.focusSearchBookInput(), 2200);
              } else {
                this.focusSearchBookInput();
              }
            }
          );
        });
      } else {
        this.setState({
          submitDisable: false,
          isOpenPaymentModel: false,
          book_status: [],
          payment_details: {},
        });
      }
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
    if (this.inputRef.current) {
      this.inputRef.current.querySelector("input").focus();
    }
    this.setState({ isOpenPaymentModel: false, submitDisable: false });
  };

  onChange = (e) => {
    let { searchField, fieldErrors } = this.state;
    const { name, value } = e.target;
    searchField[name] = value;
    delete fieldErrors[name];
    this.setState({
      searchField,
      fieldErrors,
    });
  };

  searchBook = () => {
    let { searchField, fieldErrors, user_details, bookList } = this.state;
    if (searchField["book"]) {
      const url = GET_URL.bookandusersearch.api;
      const params = { book_number: searchField["book"] };
      let props = { ...this.props };
      props["autoHideError"] = true;
      props["timing"] = 2000;
      getRequest(url, params, props).then((response) => {
        searchField["book"] = "";
        this.setState({
          searchField,
        });
        if (response && response.status === 200) {
          if (response.data?.user_details) {
            if (response.data.user_details?.assigned_books) {
              bookList = response.data.user_details?.assigned_books;
            }
            user_details = response.data.user_details
          } else {
            if (this.inputRef.current) {
              this.inputRef.current.querySelector("input").blur();
            }
            if (this.inputRefBarcode.current) {
              this.inputRefBarcode.current.querySelector("input").focus();
            }
            this.setState({
              autoFocusStudent: true,
              autoFocusBook: false,
              autoFocusBarcode: true,
            });
          }
          this.setState({
            book_details: response.data,
            bookList,
            user_details,
            book_status: response.data.issued_to_user
              ? ["RETURN", "RENEW"]
              : ["ISSUE"],
          });
        }
      });
    } else {
      fieldErrors["book"] = "Enter Book Number";
      this.setState({
        fieldErrors,
      });
    }
  };

  getStudentByBarcode = () => {
    const { searchField, fieldErrors, book_details, book_status } = this.state;
    if (searchField["barcode"]) {
      this.onStudentChange("userid", searchField["barcode"]);
      searchField["barcode"] = "";
      this.setState({
        searchField,
        book_details: null,
        user_details: null,
        bookList: [],
      });
      // const url = GET_URL.users.api;
      // const params = { search_barcode: searchField["barcode"] };
      // let props = { ...this.props };
      // props["autoHideError"] = true;
      // props["timing"] = 2000;
      // getRequest(url, params, props).then((response) => {
      //   if (response && response.status === 200) {
      //     const user_details = {
      //       id: response.data.id,
      //       is_staff: false,
      //       staff: null,
      //       student: response.data.stusdent,
      //       assigned_books: response.data.assigned_books,
      //       staff_details: null,
      //       total_fine_amount: response.data.total_fine_amount,
      //       student_details: {
      //         id: response.data.id,
      //         name: response.data?.student_details?.name,
      //         mobile_num: response.data?.student_details?.mobile_num,
      //         standard_name: response.data?.student_details?.standard_name,
      //         section_name: response.data?.student_details?.section_name,
      //         number_of_books_issues: response.data?.assigned_books?.length,
      //       },
      //     };
      //     if (book_details && book_status.includes("RETURN")) {
      //       book_details = null;
      //     }
      //     if (
      //       Array.isArray(user_details.assigned_books) &&
      //       user_details.assigned_books.length > 0 &&
      //       !book_details
      //     ) {
      //       book_details = user_details.assigned_books[0];
      //       book_status = ["RETURN", "RENEW"];
      //     }
      //     this.setState({
      //       user_details,
      //       bookList: user_details?.assigned_books ?? [],
      //       book_details,
      //       book_status: [...book_status],
      //     });
      //   } else {
      //   }
      // });
    } else {
      fieldErrors["barcode"] = "Enter Barcode";
      this.setState({
        fieldErrors,
      });
    }
  };

  // works for student and staff
  onStudentChange = (student, barcode) => {
    let { book_details, book_status } = this.state;
    const url = GET_URL.bookandusersearch.api;
    let params = {};
    if (barcode) {
      params = { user_bar_code: barcode };
    } else {
      params = { user_id: student["user_id"] };
    }
    let props = { ...this.props };
    props["autoHideError"] = true;
    props["timing"] = 2000;
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        const user_details = response.data
        if (book_details && book_status.includes("RETURN")) {
          book_details = null;
        }
        if (
          Array.isArray(user_details.assigned_books) &&
          user_details.assigned_books.length > 0 &&
          !book_details
        ) {
          book_details = user_details.assigned_books[0];
          book_status = ["RETURN", "RENEW"];
        }
        this.setState({
          user_details,
          bookList: user_details.assigned_books,
          book_details,
          book_status: [...book_status],
        });
      }
    });
  };

  handleClearBook = () => {
    let { searchField } = this.state;
    searchField["book"] = "";
    this.setState({
      book_details: null,
      searchField,
    });
  };

  handleClearUser = () => {
    let { book_status, book_details } = this.state;
    if (book_status.includes("RETURN")) {
      book_details = null;
    }
    this.setState({
      user_details: null,
      bookList: [],
      book_details,
    });
  };

  handleClearBoth = () => {
    this.handleClearBook();
    this.handleClearUser();
    if (this.inputRef.current) {
      this.inputRef.current.querySelector("input").focus();
    }
  };

  handleReviewIssue = (status) => {
    if (!this.state.isOpenReviewIssue) {
      let post_data = this.validateAndGetPostdata(status);
      if (post_data) {
        this.setState({
          post_data: post_data,
          book_action: status,
          isOpenReviewIssue: !this.state.isOpenReviewIssue,
          isRenewBookItem: true,
          isIssueBookItem: false,
          isFineCarryforward: true,
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

  focusBookInput = () => {
    const el =
      (this.bookInputRef && this.bookInputRef.current) ||
      (this.inputRef && this.inputRef.current && this.inputRef.current.querySelector("input"));
    if (el && typeof el.focus === "function") {
      el.focus();
      if (typeof el.select === "function") el.select(); // optional
    }
  };

  // Helper function to focus on search book number field
  focusSearchBookInput = () => {
    const tryFocus = () => {
      if (this.bookInputRef?.current) {
        this.bookInputRef.current.focus();
        if (typeof this.bookInputRef.current.select === "function") {
          this.bookInputRef.current.select();
        }
        return true;
      }
      if (this.inputRef?.current) {
        const input = this.inputRef.current.querySelector("input");
        if (input) {
          input.focus();
          if (typeof input.select === "function") input.select();
          return true;
        }
      }
      return false;
    };
    setTimeout(tryFocus, 0);
    setTimeout(tryFocus, 100);
    setTimeout(tryFocus, 400);
  };


  handleReviewReturn = (status, payment_done) => {
    const { book_details, user_details } = this.state;
    const post_data = this.validateAndGetPostdata(status);
    if (!post_data) return;
  
    if (!payment_done && parseInt(book_details?.fine_details?.fine_amount) > 0) {
      this.setState({
        isOpenPaymentModal: true,
        isIssueBookItem: true,
        isRenewBookItem: false,
        isFineCarryforward: false,
        paymentDetails: {
          amount: book_details?.fine_details?.fine_amount,
          student: user_details.student_details
            ? user_details.student_details.name
            : user_details.staff_details.name,
        },
      });
      return;
    }
  
    // Blur current focus so SweetAlert2 won’t “return” focus to the button
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active && typeof active.blur === 'function') active.blur();
  
    // Helper to refocus the input after the dialog has fully closed/DOM settled
    const refocus = () => this.focusBookInput();
    const defer = (cb) =>
      (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function')
        ? window.requestAnimationFrame(cb)
        : setTimeout(cb, 0);
  
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to return ${book_details?.bar_code} book!`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, return it!',
      // IMPORTANT: no didClose / returnFocus on older SweetAlert2
    }).then((result) => {
      // Always refocus after the popup is gone
      defer(refocus);
      if (result.value) {
        this.handlePostRequest(post_data, status, payment_done);
        // Refocus again after state updates render
        defer(refocus);
      }
    });
  };

  renewPaymentModel = (status, payment_done, extra_params) => {
    let { book_details, user_details, post_data, payment_details, skipPayment } = this.state;
    if (payment_details) {
      post_data['payment_details'] = payment_details
      if (skipPayment) {
        post_data["issue_return_datas"][0]["is_exempted"] = 1;
        post_data["issue_return_datas"][0]["reason_id"] = payment_details.reason_id;
      }
      if (!skipPayment && extra_params.selectedOption === "skip" && extra_params.remainingAmount > 0) {
        post_data["issue_return_datas"][0]["is_of_exempted"] = 1;
        post_data["issue_return_datas"][0]["skip_fine_amount"] = extra_params.remainingAmount;
        post_data["issue_return_datas"][0]["reason_id"] = payment_details.reason_id;
      }
    }
    if (post_data) {
      if (
        !payment_done &&
        parseInt(book_details?.fine_details?.fine_amount) > 0
      ) {
        this.setState({
          isOpenPaymentModal: true,
          paymentDetails: {
            amount: book_details?.fine_details?.fine_amount,
            student: user_details.student_details
              ? user_details.student_details.name
              : user_details.staff_details.name,
          },
        });
      } else if (
        payment_done ||
        parseInt(book_details?.fine_details?.fine_amount) === 0
      ) {
        this.handlePostRequest(post_data, status, payment_done);
      }
    }
  };

  closeFeePaymentModal = () => {
    this.setState({
      isOpenPaymentModal: false,
    }, () => {
      // Always focus on search book number field after payment modal closes
      this.focusSearchBookInput();
    });
  };

  handleKeyDown = (e) => {
    if (e.key === "Enter") {
      this.searchBook();
    }
  };

  handleKeyDownBarCode = (e) => {
    if (e.key === "Enter") {
      this.getStudentByBarcode();
    }
  };

  handleSelectBook = (index) => {
    let { bookList, book_details } = this.state;
    book_details = bookList[index];
    this.setState({
      book_details,
      book_status: ["RETURN", "RENEW"],
    });
  };

  handleUpdatePayment = (fieldValues) => {
    const { selected_status } = this.state;
    const extra_params = {
      remainingAmount: fieldValues.remainingAmount,
      selectedOption: fieldValues.selectedOption,
    }
    this.setState(
      {
        payment_details: {
          total_amount: parseFloat(fieldValues.amountToPay),
          payment_ref_num: fieldValues.refNo,
          payment_note: fieldValues.paymentNote,
          mode_of_payment: fieldValues.paymentValue,
          reason_id: fieldValues?.selectedReason?.id,
        },
        isOpenPaymentModal: false,
        skipPayment: false,
      },
      () => {
        // Focus immediately after payment modal closes (regular payment)
        setTimeout(() => {
          this.focusSearchBookInput();
        }, 200);
        
        if (selected_status === "RENEW") {
          this.renewPaymentModel(selected_status, true, extra_params);
        } else {
          this.handleReviewReturn(selected_status, true);
        }
        // Additional focus will be handled in handlePostRequest after operation completes
      }
    );
  };

  handleSkipPayment = (fieldValues) => {
    const { selected_status } = this.state;
    this.setState(
      {
        payment_details: {
          total_amount: 0,
          payment_ref_num: "",
          payment_note: fieldValues.paymentNote,
          mode_of_payment: 0,
          reason_id: fieldValues?.selectedReason?.id,
          is_exempted: 1,
        },
        isOpenPaymentModal: false,
        skipPayment: true,
      },
      () => {
        // Focus immediately after payment modal closes (skip payment)
        setTimeout(() => {
          this.focusSearchBookInput();
        }, 200);
        
        if (selected_status === "RENEW") {
          this.renewPaymentModel(selected_status, true);
        } else {
          let post_data = this.validateAndGetPostdata(selected_status);
          this.handlePostRequest(post_data, selected_status, false);
        }
        // Additional focus will be handled in handlePostRequest after operation completes
      }
    );
  };

  handleExtraParams = () => {
    let extra_params = {
      show_based_on_standard_permission: true,
      show_only_library_member: true,
    };
    const { search_fields } = this.state;
    if (search_fields === "user_student__barcode_number") {
      extra_params["search_fields"] = "user_student__barcode_number";
    }
    if (this.state.selectedCategory) {
      extra_params["category"] = this.state.selectedCategory["id"];
    }
    return extra_params;
  };

  handleStaffExtraParams = () => {
    let extra_params = {
      show_based_on_standard_permission: true,
      show_only_library_member: true,
      pagination: true,
    };
    return extra_params;
  }

  handleCloseModal = () => {
    let { user_details } = this.state;
    this.setState(
      {
        isOpenReviewIssue: false,
        book_details: null,
      },
      () => {
        if (user_details?.id) {
          this.onStudentChange({ user_id: user_details.id });
        }
        if (this.inputRef.current) {
          this.inputRef.current.querySelector("input").focus();
        }
        if (this.inputRef.current) {
          this.inputRef.current.querySelector("input").focus();
        }
      }
    );
  };

  ALLOW_ENTER_INPUT_IDS = ["book", "barcode"]; // IDs of TextFields where Enter should work

  handleGlobalKeyDown = (e) => {
    if (e.key === "Enter") {
      const activeId = e.target.id;
      const allowed = this.ALLOW_ENTER_INPUT_IDS.includes(activeId);
      
      if (!allowed) {
        e.preventDefault();
        e.stopPropagation(); // stops button click
      }
    }
  };

  handleOpenPaymentModal = (details) => {
    this.setState({
      isOpenPaymentModal: true,
      paymentDetails: details,
    });
  };

  render() {
    const {
      loading,
      searchField,
      issueUserId,
      staffList,
      submitDisable,
      openError,
      alertData,
      isOpenReviewIssue,
      post_data,
      bookIds,
      bookList,
      book_status,
      fieldErrors,
      book_details,
      isOpenPaymentModal,
      paymentDetails,
      user_details,
      allow_to_edit_fine_amount,
      book_action,
      search_fields,
      categoryList,
      selectedCategory,
      autoFocusStudent,
      autoFocusBook,
      autoFocusBarcode,
      isRenewBookItem,
      isIssueBookItem,
      isFineCarryforward,
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
            {/* {categoryList.length === 1 && ( */}
            <div className="mt-15 mb-15">
              <DropDownWithSearch
                options={categoryList}
                optionValue="name"
                name={"selectedCategory"}
                value={selectedCategory}
                onChange={(e, newValue) =>
                  this.handleDropDownSearch(newValue)
                }
                label="Category"
                hideClearIcon={true}
                className="width-300px"
                size="small"
              />
            </div>
            {/* )} */}
            {!selectedCategory ? (
              <BlankPagewithIcon data={"Select Category To Issue Book"} />
            ) : (
              <>
                <Grid container spacing={2}>
                  <Grid item md={6} xs={12}>
                    <Paper
                      className="paper-plain-bacground m-t-20px padding-15"
                      style={{ minHeight: "285px", height: "95%" }}
                    >
                      <Grid container>
                        <Grid item md={7} xs={12}>
                          <TextField
                            ref={this.inputRef}
                            inputRef={this.bookInputRef}
                            id="book"
                            autoFocus={autoFocusBook}
                            autoComplete="off"
                            label="Search Book Number"
                            name="book"
                            variant="outlined"
                            value={searchField["book"]}
                            onKeyDown={(e) => this.handleKeyDown(e)}
                            className="width-form-90"
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                            size="small"
                            onChange={(e) => this.onChange(e)}
                            error={fieldErrors["book"]}
                            helperText={fieldErrors["book"]}
                          />
                        </Grid>
                        <Grid item md={2} xs={12}>
                          <Button
                            className="custom-button-library"
                            onClick={this.searchBook}
                          >
                            Search
                          </Button>
                        </Grid>
                        <Grid item md={2} xs={12}>
                          <Button
                            className="clear-button-library"
                            onClick={this.handleClearBook}
                          >
                            Clear
                          </Button>
                        </Grid>
                      </Grid>
                      {this.getbookList()}
                    </Paper>
                  </Grid>
                  <Grid item md={6} xs={12}>
                    <Paper
                      className="paper-plain-bacground m-t-20px p-20px"
                      style={{ minHeight: "285px" }}
                    >
                      <div className="d-flex">
                        <div className="">
                          <Dropdown
                            data={[
                              {
                                id: "user_student__barcode_number",
                                name: "Barcode",
                              },
                              {
                                id: "student_name",
                                name: "Student Name",
                              },
                              {
                                id: "staff_name",
                                name: "Staff Name",
                              },
                            ]}
                            value={search_fields}
                            hideSelect={true}
                            size={"small"}
                            name="search_fields"
                            style="width-130-px"
                            label={"Search By"}
                            onChange={this.handleChange}
                          />
                        </div>
                        <div className="ml-5" style={{ width: "100%" }}>
                          {search_fields === "user_student__barcode_number" ? (
                            <TextField
                              ref={this.inputRefBarcode}
                              id="barcode"
                              autoFocus={autoFocusBarcode}
                              autoComplete="off"
                              label="Search Barcode"
                              name="barcode"
                              variant="outlined"
                              value={searchField["barcode"]}
                              onKeyDown={(e) => this.handleKeyDownBarCode(e)}
                              className="width-form-90"
                              inputProps={{ maxLength: 50 }}
                              fullWidth
                              size="small"
                              onChange={(e) => this.onChange(e)}
                              error={fieldErrors["barcode"]}
                              helperText={fieldErrors["barcode"]}
                            />
                          ) : search_fields === "student_name" ? (
                            <DropDownWithSearchApi
                              onStudentChange={this.onStudentChange}
                              show_based_on_standard_permission={true}
                              extra_param={this.handleExtraParams()}
                              sendBranch={false}
                              autoFocus={autoFocusStudent}
                            />
                          )
                            : (
                              <DropDownWithSearchApiStaff
                                onStaffChange={this.onStudentChange}
                                show_based_on_standard_permission={true}
                                extra_param={this.handleStaffExtraParams()}
                                sendBranch={false}
                                autoFocus={autoFocusStudent}
                              />
                            )}
                        </div>
                        <div>
                          <Button
                            className="clear-button-library"
                            onClick={this.handleClearUser}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      {this.getUserList()}
                    </Paper>
                  </Grid>
                </Grid>
                <Box className="leave-pending-approve-reject">
                  <Button
                    className={
                      book_status.includes("ISSUE") && user_details
                        ? "apply-leave-button"
                        : "apply-leave-button opacity-7 not-allowed"
                    }
                    onClick={
                      book_status.includes("ISSUE") && user_details
                        ? (e) => this.handleReviewIssue("ISSUE")
                        : ""
                    }
                  >
                    ISSUE
                  </Button>
                  <Button
                    className={
                      book_status.includes("RETURN")
                        ? "return-button"
                        : "return-button-no-drop opacity-7 not-allowed"
                    }
                    onClick={
                      book_status.includes("RETURN")
                        ? (e) => this.handleReviewReturn("RETURN")
                        : ""
                    }
                  >
                    <Tooltip
                      title={
                        book_status.includes("RETURN")
                          ? "RETURN THE BOOK"
                          : "Book Is Not Issued"
                      }
                      enterDelay={200}
                      enterNextDelay={200}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <div>RETURN</div>
                    </Tooltip>
                  </Button>

                  <Button
                    className={
                      book_status.includes("RENEW")
                        ? "renew-button"
                        : "renew-button-no-drop opacity-7 not-allowed"
                    }
                    onClick={
                      book_status.includes("RENEW")
                        ? (e) => this.handleReviewIssue("RENEW")
                        : ""
                    }
                  >
                    <Tooltip
                      title={
                        book_status.includes("RETURN")
                          ? "RENEW THE BOOK"
                          : "Book Is Not Issued"
                      }
                      enterDelay={200}
                      enterNextDelay={200}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <div>RENEW</div>
                    </Tooltip>
                  </Button>
                  <Button
                    className="renew-button"
                    onClick={this.handleClearBoth}
                  >
                    CLEAR
                  </Button>
                </Box>
                {bookList.length > 0 && (
                  <div>
                    <h2 className="table-heading">Current Issued Book Details for ({user_details?.is_staff ? user_details?.staff_details?.name : user_details?.student_details?.name})</h2>
                    <table width="100%" className="selectable-row-table mt-20">
                      <thead className="table-select-hostel-thead">
                        <th className={`selectable-table-head`}> Select </th>
                        <th className={`selectable-table-head`}> Book Number </th>
                        <th className={`selectable-table-head`}>
                          Category (Sub Category)
                        </th>
                        <th className={`selectable-table-head`}> Book Title </th>
                        <th className={`selectable-table-head`}> Issue Date </th>
                        <th className={`selectable-table-head`}> Renew Date </th>
                        <th className={`selectable-table-head`}> Due Date </th>
                        <th className={`selectable-table-head`}> Fine Amount </th>
                      </thead>
                      <tbody className="selectable-row-table-body">
                        {bookList.map((book, index) => {
                          return (
                            <tr
                              onClick={() => this.handleSelectBook(index)}
                              key={index}
                              className={
                                book.id === book_details?.id
                                  ? "selectable-row-table-row text-blue"
                                  : "selectable-row-table-row"
                              }
                            >
                              <td className={"textAlign"}>
                                <Box className="text-align-center">
                                  <Checkbox
                                    color="primary"
                                    name={book.name}
                                    checked={book.id === book_details?.id}
                                    inputProps={{
                                      "aria-label": "primary checkbox",
                                    }}
                                    className={"padding-0"}
                                  />
                                </Box>
                              </td>
                              <td className={"textAlign pl-15"}>
                                <Box display="flex">
                                  <Box>{book.book_number}</Box>
                                </Box>
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {!!book?.book__sub_category__name
                                  ? `${book.book__category__name} (${book?.book__sub_category__name} )`
                                  : book.book__category__name}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {/* {book.author_details
                                ? getCommaSeperatedArrayOfObjects(
                                    book.author_details,
                                    "author__name"
                                  )
                                : ""} */}
                                {!!book?.book__title
                                  ? `${book.book__title} (${book?.book__title})`
                                  : book.book__title}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {book.issued_on
                                  ? dateFormat(
                                    book.issued_on,
                                    "DD-MM-YYYY hh:mm A"
                                  )
                                  : ""}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {book.renew_date
                                  ? dateFormat(
                                    book.renew_date,
                                    "DD-MM-YYYY hh:mm A"
                                  )
                                  : "-"}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {book.due_date
                                  ? dateFormat(
                                    book.due_date,
                                    "DD-MM-YYYY hh:mm A"
                                  )
                                  : ""}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {numberWithCommas(
                                  book?.fine_details?.fine_amount
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {bookList.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="text-center font-weight-bold"
                            >
                              No Data Found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Paper>

          {isOpenReviewIssue && (
            <ReviewIssueModal
              issueUserId={issueUserId}
              closeInParent={this.handleCloseModal}
              post_data={post_data}
              user_details={user_details}
              book_action={book_action}
              book_details={book_details}
              handleOpenPaymentModal={this.handleOpenPaymentModal}
            />
          )}

          {isOpenPaymentModal && (
            <PaymentModal
              payDisabled={submitDisable}
              amountDetails={paymentDetails}
              closeFeePaymentModal={() => this.closeFeePaymentModal()}
              payFees={this.handleUpdatePayment}
              payFeesWithSkip={(field) => this.handleSkipPayment(field)}
              isTaxHide={true}
              isAmountCanEdit={allow_to_edit_fine_amount}
              isIssueBookItem={isIssueBookItem}
              isRenewBookItem={isRenewBookItem}
              isReasonOnEdit={true}
              isSkipRequired={true}
              isReasonOnSkip={true}
              reasonName={"library_issue_return_reason"}
              isFineCarryforward={isFineCarryforward}
              hide_is_mode_of_pay_multiple={true}
            />
          )}

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
export default withRouter(IssueBooksNew);
