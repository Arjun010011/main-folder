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
  TextField,
  Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@material-ui/core";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import InfoIcon from "@material-ui/icons/Info";
import Swal from "sweetalert2";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { Actions } from "Constants/permissions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import Chip from "@material-ui/core/Chip";
import Avatar from "@material-ui/core/Avatar";
import PaymentModal from "Components/PaymentModalNew";

import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import {
  isUserHasPermission,
  getFullName,
  validateDate,
  Alert,
  dateFormat,
  numberWithCommas,
} from "Includes/functions";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { minDate } from "Constants";
import AssignStudentItemIssue from "./Components/AssignStudentItemIssue";
import AssignStaffItemIssue from "./Components/AssignStaffItemIssue";
import AddStockItemStore from "Containers/StoreManagement/Components/AddStockItemStore";

import _ from "lodash";

const maxDate = new Date();

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const isModifyContent = true;

class IssueItems extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      selected_date: new Date(),
      fieldErrors: {},
      selectedFilter: "student",
      data_list: [],
      stockItemList: [
        // { item: "", category: "", sub_category: "", quantity: "" },
      ],
      guest_name: "",
      submitDisable: false,
      transaction_id: Date.now(),
      stockItemDetails: {},
      isOpenPaymentModel: false,
      isOpenZeroPayment: false,
      payeeName: '',
    };
    this.studentModalRef = React.createRef();
    this.staffModalRef = React.createRef();
    this.addItemStoreRef = React.createRef();
  }

  componentDidMount() {
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

  // addDataToList = (new_list) => {
  //   let { data_list } = this.state;
  //   data_list.map((data) => {
  //     new_list.map((student, sIndex) => {
  //       if (data.id === student.id) {
  //         new_list.splice(sIndex, 1);
  //       }
  //     });
  //   });
  //   data_list = [...data_list, ...new_list];
  //   this.setState({
  //     data_list,
  //   });
  // };

  addDataToList = (new_list) => {
    let { data_list } = this.state;
    const existingIds = new Set(data_list.map(data => data.id));
    const filteredNewList = new_list.filter(student => !existingIds.has(student.id));
    const updatedDataList = [...data_list, ...filteredNewList];
    this.setState({
      data_list: updatedDataList,
    });
    if (filteredNewList.length < new_list.length) {
      Swal.fire({
        icon: "info",
        title: "Some entries already exist",
        text: "Duplicate students/staff were skipped.",
      });
    }
  };

  openItemList = () => {
    let {itemIndex} = this.state
    this.setState(
      {
        itemIndex,
      },
      () => {
        this.addItemStoreRef.current.openModal();
      }
    );
  };

  selectedItem = (selectedItems) => {
    let { stockItemList } = this.state;
  
    // Push all selected items into stockItemList
    selectedItems.forEach((selectedItem) => {
      const newItem = {
        id: selectedItem.id,
        category: selectedItem.category,
        category_name: selectedItem.category_name,
        item: selectedItem.item,
        item_code: selectedItem.item_code,
        item_name: selectedItem.item_name,
        property_value: selectedItem.property_value,
        property_values: selectedItem.property_values,
        sub_category: selectedItem.sub_category,
        sub_category_name: selectedItem.sub_category_name,
        quantity: selectedItem.quantity,
        unit_price: selectedItem.current_selling_price,
      };
  
      // Optional: avoid duplicates (by id)
      if (!stockItemList.some(item => item.id === newItem.id)) {
        stockItemList.push(newItem);
      }
    });
  
    this.setState({
      stockItemList,
      fieldErrors: {},
    });
  };

  validateDuplicate = () => {
    let { fieldErrors, stockItemList, alertData } = this.state;
    let returnValue = true;
    let returnItemDetails = [];
    alertData = "Clear Error(s)";
    for (let pIndex = 0; pIndex < stockItemList.length; pIndex++) {
      let temp = {};
      for (let cIndex = 0; cIndex < stockItemList.length; cIndex++) {
        if (
          stockItemList[pIndex].item === stockItemList[cIndex].item &&
          pIndex !== cIndex &&
          isEqual(
            stockItemList[pIndex].property_value,
            stockItemList[cIndex].property_value
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
      if (!stockItemList[pIndex].item) {
        fieldErrors[`item${pIndex}`] = (
          <FormattedMessage {...commonMessages.enterValue} />
        );
        returnValue = false;
        alertData = "Please Select Item";
      }
      if (!stockItemList[pIndex].quantity) {
        fieldErrors[`quantity${pIndex}`] = (
          <FormattedMessage {...commonMessages.enterValue} />
        );
        returnValue = false;
      } else if (!floatNumberWithTwoDecimalRegex.value.test(stockItemList[pIndex].quantity)) {
        fieldErrors[`quantity${pIndex}`] = "Invalid Number";
        returnValue = false;
      }
      temp["quantity"] = stockItemList[pIndex].quantity;
      temp["sub_category"] = stockItemList[pIndex].sub_category;
      temp["category"] = stockItemList[pIndex].category;
      temp["property_value"] = stockItemList[pIndex].property_value;
      temp["item"] = stockItemList[pIndex].item;
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
    let { fieldErrors, stockItemList } = this.state;
    let validate = this.validateDuplicate();
    if (validate) {
      let temp = {
        item: "",
        category: "",
        sub_category: "",
        quantity: "",
        unit_price: "",
        amount: "",
      };
      stockItemList.push(temp);
      this.setState({
        stockItemList,
        fieldErrors,
      });
    }
  };

  onChangeFieldValue = (e, index) => {
    let { stockItemList, fieldErrors } = this.state;
    let { name, value } = e.target;
    stockItemList[index][name] = value;
    if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
      fieldErrors[`${name}${index}`] = "Invalid Number";
    } else {
      fieldErrors[`${name}${index}`] = "";
    }
    this.setState({
      stockItemList,
      fieldErrors,
    });
  };

  handleDeleteProperty = (index) => {
    let { fieldErrors, stockItemList } = this.state;
    stockItemList.splice(index, 1);
    fieldErrors = {};
    this.setState({
      stockItemList,
      fieldErrors,
    });
  };

  removeStudentOrStaff = (index) => {
  let { data_list } = this.state;
  data_list.splice(index, 1);
  this.setState({
    data_list,
  });
};
  getSelectedItemsTotalAmount = () => {
    const { stockItemList } = this.state;
    let total = 0;
    stockItemList.map((data,index)=>{
      if( data['unit_price'] && data['quantity']){
        const amount = parseFloat(this.getAmount(index));
        if (!isNaN(amount)) total += amount;
      }
    })
    return total;
  };

  getStockItemList = () => {
    const { fieldErrors, stockItemList } = this.state;
    return (
      <TableContainer component={Paper} className="header-align">
        <Table aria-label="simple table">
          <TableHead className="table-header-color">
            <TableRow>
              <TableCell>Stock Item</TableCell>
              <TableCell>Category - Sub Category</TableCell>
              <TableCell>Property Value</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockItemList.map((row, index) => (
              <TableRow>
                <TableCell>
                  {row.item && (
                    <Box className="flex-justify-space-between max-width">
                      <Box
                        className={
                          fieldErrors[`item${index}`] ? "red-text" : ""
                        }
                      >
                        {row.item_name}
                      </Box>
                      <Box className="pr-10-px pointer">
                        <Tooltip
                          title={"Change Item"}
                          enterDelay={400}
                          enterNextDelay={400}
                          placement="top-start"
                          classes={{ tooltip: "tooltip-show-data" }}
                        >
                          <EditOutlinedIcon
                            onClick={() => this.openItemList(index)}
                          />
                        </Tooltip>
                      </Box>
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  {row.sub_category_name
                    ? `${row?.category_name} - ${row?.sub_category_name}`
                    : row?.category_name}
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={
                      row.property_values &&
                      row.property_values.map((data, index) => {
                        return (
                          <Box>{`${data.properties_name} - ${data.name}`}</Box>
                        );
                      })
                    }
                    enterDelay={400}
                    enterNextDelay={400}
                    placement="top-start"
                    classes={{ tooltip: "tooltip-show-data" }}
                  >
                    <Box className="stock-property-value">
                      {row.property_values &&
                        row.property_values.map((data, index) => {
                          return (
                            <Box>
                              {(row.property_values.length < 3 ||
                                (row.property_values.length > 2 &&
                                  index !== 1)) &&
                                `${data.properties_name} - ${data.name}`}
                              {row.property_values.length > 2 &&
                                index === 1 &&
                                `${data.properties_name} - ${data.name} ....`}
                            </Box>
                          );
                        })}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {row.item && (
                    <Tooltip
                      title={fieldErrors[`quantity${index}`]}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={
                        fieldErrors[`quantity${index}`]
                          ? { tooltip: "tooltip-show-data" }
                          : { tooltip: "bgcolor-transparent" }
                      }
                    >
                      <TextField
                        id="outlined-name"
                        label=""
                        fullWidth
                        value={row.quantity}
                        name={"quantity"}
                        onChange={(e) => this.onChangeFieldValue(e, index)}
                        autoComplete="off"
                        error={
                          fieldErrors[`quantity${index}`] === "" ||
                            !fieldErrors[`quantity${index}`]
                            ? false
                            : true
                        }
                        inputProps={{ maxLength: 5 }}
                        className="width-100-px padding-0"
                        InputProps={{
                          endAdornment: fieldErrors[`quantity${index}`] ? (
                            <InfoIcon className="time-table-info-icon" />
                          ) : (
                            ""
                          ),
                        }}
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  {row.item && isModifyContent ? (
                    <TextField
                      id="outlined-name"
                      label=""
                      fullWidth
                      value={row.unit_price}
                      name={"unit_price"}
                      onChange={(e) => this.onChangeFieldValue(e, index)}
                      autoComplete="off"
                      error={
                        fieldErrors[`unit_price${index}`] === "" ||
                          !fieldErrors[`unit_price${index}`]
                          ? false
                          : true
                      }
                      inputProps={{ maxLength: 5 }}
                      className="width-100-px padding-0"
                      InputProps={{
                        endAdornment: fieldErrors[`unit_price${index}`] ? (
                          <InfoIcon className="time-table-info-icon" />
                        ) : (
                          ""
                        ),
                      }}
                    />
                  ) : (
                    row.unit_price
                  )}
                </TableCell>
                <TableCell>
                  <Box className="display-flex">
                    <Box>
                      {stockItemList.length > 0 && row.item_name && (
                        <Button color="secondary" className="min-max-w-0">
                          <DeleteOutlineIcon
                            onClick={() => this.handleDeleteProperty(index)}
                            className="add-icon-stock-item"
                          />
                        </Button>
                      )}
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell>
                <Button
                  className="form-next-pre-button float-right"
                  onClick={() => this.openItemList()}
                >
                  {" "}
                  Select Item{" "}
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/* <Box className="float-right p-r-20px">
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
        </Box> */}
        {stockItemList &&   stockItemList.length > 0 &&
          <Box className="w-100">
            <Box className="p-r-20px font-weight-bold m-t-10px p-10">
              Selected Items Total: 
              {numberWithCommas(this.getSelectedItemsTotalAmount())}
            </Box>
          </Box>
        }
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
    const {
      selected_date,
      data_list,
      stockItemList,
      selectedFilter,
      fieldErrors,
      guest_name,
      transaction_id,
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
    if (stockItemList.length == 0) {
      return_error = "Select atleast one stock item";
      returnValue = false;
    }
    if (selectedFilter != 'guest' && data_list.length == 0) {
      return_error = `Select atleast one ${selectedFilter} item`;
      returnValue = false;
    }
    if( selectedFilter == 'guest' && !guest_name){
      return_error = `Select atleast one ${selectedFilter} item`;
      returnValue = false;
    }
    let stock_list = [];
    let post_list = [];
    let stock_temp = {};
    let guest_list = []
    stockItemList.map((stock, index) => {
      stock_temp = {};
      if (!stock.quantity) {
        fieldErrors[`quantity${index}`] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        returnValue = false;
      } else if (parseFloat(stock.quantity) <= 0) {
        fieldErrors[`quantity${index}`] = "Enter valid number";
        returnValue = false;
      } else {
        stock_temp["stock"] = stock.id;
        stock_temp["quantity"] = parseFloat(stock.quantity);
        stock_temp["unit_price"] = parseFloat(stock.unit_price);
      }
      stock_list.push(stock_temp);
    });
    if (selectedFilter !== "guest") {
      for (const data of data_list) {
        post_list.push({
          user: data["user_id"],
          transaction_id: `${data["user_id"]}_${transaction_id}`,
        });
      }
    }else{
      guest_list.push({
        guest_name: guest_name,
        transaction_id: `${guest_name}_${transaction_id}`,
      })
    }
    this.setState({
      fieldErrors,
      openError: return_error ? return_error : false,
      submitDisable: returnValue,
      alertData: return_error,
    });
    if (returnValue) {
      returnValue = {
        for_date: dateFormat(selected_date, "YYYY-MM-DD"),
        stock_details: stock_list,
        user: post_list,
        guest_list: guest_list,
        tax_amount: 0,
        mode_of_payment: "",
      };
    }
    return returnValue;
  };

  saveData = () => {
    let post_data = this.validateAndGetPostdata();
    if (post_data) {
      const totalAmount = this.getAllStudentsTotalAmount();
      const { selectedFilter, data_list, guest_name } = this.state;

      let payeeName = "";
      if (selectedFilter === "guest") {
        payeeName = guest_name;
      } else if (data_list.length === 1) {
        const person = data_list[0];
        payeeName = getFullName(person.first_name, person.middle_name, person.last_name);
      } else {
        payeeName = `${data_list.length} ${selectedFilter}s`;
      }
      const amountDetails = {
        student: "",
        amount: totalAmount,
      };
      if (totalAmount === 0) {
        this.setState({
          isOpenZeroPayment: true,
          amountDetails,
          isOpenPaymentModel: false,
          payeeName
        });
      } else {
        this.setState({
          isOpenPaymentModel: true,
          amountDetails,
          isOpenZeroPayment: false,
          payeeName
        });
      }
    }
  };

  handlePostRequest = (data, mode_of_payment_list) => {
    let post_data = this.validateAndGetPostdata();
    let url = POST_URL.itemsold.api;
    post_data.mode_of_payment = data?.paymentValue;
    post_data.payment_reference_num = data?.refNo;
    post_data.payee_name = data?.payeeName;
    let mode_of_payment_list_data = [];
    mode_of_payment_list.map((data) => {
      mode_of_payment_list_data.push({
        mode_of_payment: data.paymentValue.name,
        payment_ref_num: data.payment_ref_num,
        note: "",
        amount: parseFloat(data.amount),
      });
    });
    post_data["mode_of_payment_list"] = mode_of_payment_list_data;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.store_issue_items.view.url);
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
    const { stockItemList } = this.state;
    let total = "";
    if (
      stockItemList[index].quantity &&
      stockItemList[index].unit_price &&
      parseFloat(stockItemList[index].quantity) > 0 &&
      parseFloat(stockItemList[index].unit_price) > 0
    ) {
      total =
      parseFloat(stockItemList[index].quantity) *
      parseFloat(stockItemList[index].unit_price);
    }

    return total;
  };

  getTotalAmount = () => {
    const { stockItemList } = this.state;
    let total = 0;
    for (let index = 0; index < stockItemList.length; index++) {
      if (parseFloat(this.getAmount(index))) {
        total = parseFloat(this.getAmount(index)) + parseFloat(total);
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
    if (parseFloat(tax) >= 0 && parseFloat(discount) >= 0) {
      total = this.getTotalAmount();
      total = parseFloat(parseFloat(total) + parseFloat(tax)) - parseFloat(discount);
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
    const { data_list, selectedFilter } = this.state;
    let total = this.getTotalAmount();
    if( selectedFilter == 'guest' ){
      return total * 1
    }
    return total * data_list.length
  };

  closeFeePaymentModal = () => {
    this.setState({
      isOpenPaymentModel: false,
      isOpenZeroPayment: false,
      submitDisable: false
    });
  };

  render() {
    const {
      loading,
      selected_date,
      fieldErrors,
      selectedFilter,
      data_list,
      guest_name,
      staffList,
      submitDisable,
      openError,
      alertData,
      isOpenPaymentModel,
      isOpenZeroPayment
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
                  {Actions.store_issue_items.view.label}
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.store_issue_items.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />
                    {Actions.store_issue_items.view.label}
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
                  {this.getStockItemList()}
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
                      <label className='cursor-pointer' onChange={() => this.onChangeFilter('guest')}>
                          <input type='radio' value='guest' name='selectedFilter'
                              checked={selectedFilter == 'guest'}
                              defaultChecked={selectedFilter == 'guest'}
                          /> Guest
                      </label>
                  </Box>
                  {selectedFilter === "guest" ? (
                    <Box className="p-20px">
                      <TextField
                        id="number"
                        label="Guest Name"
                        type="text"
                        autoComplete="off"
                        name="guest_name"
                        value={guest_name}
                        className="width-100"
                        onChange={(e) => this.handleChange(e)}
                        defaultValue=""
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{ maxLength: 50 }}
                        helperText={
                          !fieldErrors["guest_name"]
                            ? ""
                            : fieldErrors["guest_name"]
                        }
                        error={
                          fieldErrors["guest_name"] &&
                          (fieldErrors["guest_name"] ? true : false)
                        }
                      />
                    </Box>
                  ) : (
                    <>
                      <Box className="routeplan-card-bottom p-t-20px p-l-20px">
                        <PersonAddIcon
                          onClick={() => this.handleOpen()}
                          className="pointer"
                        />
                        <Box className="round-badge">{data_list.length}</Box>
                      </Box>
                      {data_list.length > 0 && (
                        <table
                          width="100%"
                          className="selectable-row-table mt-20"
                        >
                          <thead className="table-select-hostel-thead">
                            <th className={`selectable-table-head`}>
                              {" "}
                              Student Name{" "}
                            </th>
                            <th className={`selectable-table-head`}>
                              {" "}
                              Amount{" "}
                            </th>
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
                                      {numberWithCommas(this.getTotalAmount())}
                                    </td>
                                    <td className={"textAlign pl-15 "}>
                                      <Button 
                                        variant="outlined" 
                                        color="secondary" 
                                        size="small"
                                        onClick={() => this.removeStudentOrStaff(index)}
                                      >
                                        Cancel
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            <tr className={"selectable-row-table-row"}>
                              <td
                                className={`textAlign pl-15 font-weight-bold`}
                              >
                                Total Amount
                              </td>
                              <td
                                className={`textAlign pl-15 font-weight-bold`}
                              >
                                {numberWithCommas(
                                  this.getAllStudentsTotalAmount()
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </>
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
          <AddStockItemStore
            ref={this.addItemStoreRef}
            selectedItem={this.selectedItem}
            selectedItems={this.state.stockItemList}
          />
          <Box className="submt-button-float-bottom" mt={3}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.saveData}
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
          {isOpenPaymentModel && (
            <PaymentModal
              payDisabled={this.props.payDisabled}
              amountDetails={this.state.amountDetails}
              closeFeePaymentModal={() => this.closeFeePaymentModal()}
              payFees={this.handlePostRequest}
              isTaxHide={true}
              payeeName={this.state.payeeName}
            />
          )}
          {isOpenZeroPayment && (
            <Dialog open onClose={this.closeFeePaymentModal}>
              <DialogTitle>Paying Amount will be 0</DialogTitle>
              <DialogContent>
                The total amount is ₹0. Would you like to proceed?
              </DialogContent>
              <DialogActions>
                <Button onClick={this.closeFeePaymentModal} color="secondary">
                  Cancel
                </Button>
                <Button onClick={() => {
                  this.handlePostRequest();
                  this.closeFeePaymentModal();
                }} color="primary" variant="contained">
                  Confirm
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </Box>
      );
    }
  }
}
export default withRouter(IssueItems);
