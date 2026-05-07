import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  TextField,
  Tooltip,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { cloneDeep } from "lodash";
import Snackbar from "@material-ui/core/Snackbar";

import AddItemStore from "Containers/StoreManagement/Components/AddItemStore";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import MultipleAddTextFields from "Components/MultipleAddTextFields";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Alert, dateFormat, isUserHasPermission } from "Includes/functions";
import DynamicForm from "Components/DynamicForm";
import { Actions } from "Constants/permissions";
import _ from "lodash";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { book_basic_global } from "./Components/AddBookFields";
import PreviewBooksNew from "./Components/PreviewBooks";
import EditIcon from "@material-ui/icons/Edit";
import { Pages } from "@material-ui/icons";

const authorDetailsGlobal = [
  {
    label: "Author Name",
    regex: "",
    autoFocus: true,
    name: "author",
    md: 12,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDownWithSearchAndAddApi",
    list: [],
    gridClassName: "margin-vertical-20",
    size: "small",
  },
];

class AddBook extends Component {
  constructor(props) {
    super(props);

    this.state = {
      stockItemFieldDetails: null,
      isEditForm: false,
      openError: "",
      alertData: "",
      stockItem: {},
      propertyList: [],
      fieldErrors: {},
      propertiesList: [],
      stockItemDetails: { book_number: [], new_book_number: [] },
      propertyValueList: {},
      selectedItem: {},
      loading: true,
      subCategoryList: [],
      canModifyStock: true,
      authorFieldDetails: null,
      authorList: [],
      publisherList: [],
      isOpenReview: false,
      postData: {},
      selectedAuhtors: [],
      autoEditDetails: [],
      bookId: "",
      deletable_book_copy_ids: [],
    };
  }

  componentDidMount = async () => {
    let params = { is_active: true };
    if (this.props.location.pathname === Actions.library_books.update.url) {
      if (!this.props.location?.state?.detail) {
        this.props.history.push(Actions.library_books.view.url);
        return;
      }
    }
    try {
      const res = await Promise.all([
        getRequest(GET_URL.librarycategory.api, params, this.props),
        getRequest(GET_URL.librarypublisher.api, params, this.props),
        getRequest(GET_URL.getstandard.api, params, this.props),
        getRequest(GET_URL.libraryauthor.api, params, this.props),
      ]);
      this.getCategoryList(res[0]);
      this.getPublisherList(res[1]);
      this.getStandardList(res[2]);
      this.getAuthorList(res[3]);
      if (this.props.location.pathname === Actions.library_books.update.url) {
        this.getBookDetails(this.props.location.state.detail);
      } else {
        this.updateStockItemFieldDetails();
      }
    } catch {
      throw Error("Promise failed");
    }
    this.addItemStoreRef = React.createRef();
  };

  getStandardList = (response) => {
    this.setState({
      standardList: response.data.data,
    });
  };

  updateStockItemFieldDetails = (stockDetails) => {
    let {
      stockItemDetails,
      canModifyStock,
      categoryList,
      propertiesList,
      propertyList,
      propertyValueList,
      subCategoryList,
      selectedItem,
      publisherList,
      authorList,
      standardList
    } = this.state;
    let fieldDetail = _.cloneDeep(book_basic_global);
    let value;
    fieldDetail.forEach((field) => {
      if (
        stockDetails &&
        (stockDetails[field.name] ||
          stockDetails[field.name] == 0 ||
          stockDetails?.["book_detail"]?.[field.name])
      ) {
        value = stockDetails?.["book_detail"]?.[field.name]
          ? stockDetails["book_detail"][field.name]
          : stockDetails?.[field.name];
      } else {
        value = field.default;
      }
      field.default = value;
      if (field.name === "category") {
        field.list = categoryList;
      } else if (field.name === "publisher") {
        publisherList.map((data) => {
          if (data["id"] === stockDetails?.publisher) {
            value = data;
          }
        });
        field.list = publisherList;
      }
      else if (stockDetails && field.name === "sub_category") {
        subCategoryList.map((data) => {
          if (data["id"] === stockDetails?.sub_category) {
            value = data;
          }
        });
        field.list = subCategoryList;
      }
      else if (field.name === "book_standard_mapping") {
        if (stockDetails?.book_standard_mapping_book) {
          value = []
          stockDetails.book_standard_mapping_book.map((data) => {
            standardList.map((std) => {
              if (data["standard"] === std["id"]) {
                std["standard_id"] = data["id"]
                value.push(std)
              }
            })
          })
        }
        field.list = standardList;
      }
      else if (field.name === "is_min_stock") {
        field.hidden = !canModifyStock;
        if (stockDetails?.min_stock > 0) {
          value = true;
        }
      }
      else if (field.name === "available_stock" || field.name === "reason") {
        field.hidden = canModifyStock;
        field.required = true;
      }
      stockItemDetails[field["name"]] = value;
      field.default = value;
    });
    if (stockDetails?.property_values?.length > 0) {
      let temp = { selectedProperty: "", selectedPropertyValue: "" };
      stockDetails.property_values.map((data) => {
        temp = { selectedProperty: "", selectedPropertyValue: "" };
        propertiesList.map((propData) => {
          if (data.properties === propData["id"]) {
            temp["selectedProperty"] = propData;
          }
        });
        propertyValueList[temp["selectedProperty"]] = data;
        temp["selectedPropertyValue"] = data;
        propertyList.push(temp);
      });
    }
    let authorFieldDetails = cloneDeep(authorDetailsGlobal);
    authorFieldDetails[0]["list"] = authorList;
    if (stockDetails) {
      selectedItem["name"] = stockDetails.item_name;
      selectedItem["code"] = stockDetails.item_code;
      selectedItem["id"] = stockDetails.item;
    }
    if (stockDetails) {
      stockItemDetails["book_id"] = stockDetails["id"];
      stockItemDetails["book_detail_id"] =
        stockDetails?.["book_detail"]?.["id"];
      stockItemDetails["number_of_copies"] = stockDetails["number_of_copies"];
    }
    this.setState({
      stockItemDetails,
      stockItemFieldDetails: fieldDetail,
      propertyValueList,
      propertyList,
      selectedItem,
      authorFieldDetails,
      loading: false,
    });
  };

  updateStockItemDetails = (name, value) => {
    let { stockItemDetails, fieldErrors } = this.state;
    stockItemDetails[name] = value;
    fieldErrors[name] = "";
    this.setState({
      stockItemDetails,
    });
  };

  getCategoryList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        categoryList: response.data.data,
      });
    }
  };

  getPublisherList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        publisherList: response.data.data,
      });
    }
  };

  getAuthorList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        authorList: response.data.data,
      });
    }
  };

  getSubCategoryList = (id) => {
    const url = GET_URL.librarysubcategory.api;
    const params = { is_active: 1, category: id };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            subCategoryList: response.data.data,
            isEditForm: true,
          },
          () => {
            this.updateStockItemFieldDetails(this.state.stockDetails);
          }
        );
      }
    });
  };

  getBookDetails = (id) => {
    const { authorList } = this.state;
    const url = GET_URL.librarybook.api + id + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.getSubCategoryList(response.data.category);
        let autoEditDetails = [];
        authorList.map((authData) => {
          response.data.data.book_author_mapping_book.map((data) => {
            if (data["author"] == authData["id"]) {
              autoEditDetails.push({ author: authData });
            }
          });
        });
        this.setState({
          stockDetails: response.data.data,
          autoEditDetails,
          bookId: id,
          canModifyStock: !(
            response.data?.item_issued_data?.total_items ||
            response.data?.item_purchased_data?.total_items
          ),
        });
      }
    });
  };

  validateDuplicate = () => {
    let { fieldErrors, propertyList } = this.state;
    let returnValue = true;
    let returnPropertyValueIDs = [];
    for (let pIndex = 0; pIndex < propertyList.length; pIndex++) {
      for (let cIndex = 0; cIndex < propertyList.length; cIndex++) {
        if (
          propertyList[pIndex].selectedProperty.id ===
          propertyList[cIndex].selectedProperty.id &&
          pIndex !== cIndex
        ) {
          fieldErrors[`selectedProperty${pIndex}`] = (
            <FormattedMessage {...commonMessages.duplicateFoundLabel} />
          );
          returnValue = false;
        }
      }
      if (propertyList[pIndex].selectedPropertyValue)
        returnPropertyValueIDs.push(
          propertyList[pIndex].selectedPropertyValue.id
        );
    }
    this.setState({
      fieldErrors,
    });
    if (returnValue) {
      returnValue = returnPropertyValueIDs;
    }
    return returnValue;
  };

  selectedItem = (id, name, code) => {
    let selectedItem = { id: id, name: name, code: code };
    this.setState({
      selectedItem,
    });
  };

  openItemList = () => {
    this.addItemStoreRef.current.openModal();
  };

  getAuthorIds = () => {
    const { selectedAuhtors } = this.state;
    let return_value = [];
    selectedAuhtors.map((data) => {
      return_value.push(data.author["id"]);
    });
    return return_value;
  };

  validationAndPostData = () => {
    let {
      stockItemDetails,
      stockItemFieldDetails,
      fieldErrors,
      alertData,
      openError,
      isEditForm,
      selectedAuhtors,
      stockDetails,
      deletable_book_copy_ids,
    } = this.state;
    let validateValue = true;
    let returnValue = true;
    let authorValidate = true;
    let postData = {};
    stockItemFieldDetails.map((field) => {
      let value = stockItemDetails[field.name];
      let name = field.name;
      if (!field.hidden && field.required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        validateValue = false;
      }
      else if (
        field.regex &&
        !field.regex.value.test(value) &&
        Boolean(value)
      ) {
        fieldErrors[name] = field.regex.errorText;
        validateValue = false;
      } else if (
        name === "num_of_copies" &&
        parseInt(value) <= 0 &&
        !isEditForm
      ) {
        fieldErrors[name] = "At least 1 count should be there";
        validateValue = false;
      }
    });
    let duplicateValue = this.validateDuplicate();
    if (!validateValue) {
      this.refs.stock_item.updateErrors(fieldErrors);
    }
    authorValidate = this.refs.author.validateFields();
    if (!authorValidate) {
      alertData = "Clear author error(s)";
    }
    if (!duplicateValue || !validateValue || !authorValidate) {
      returnValue = false;
    }
    if (selectedAuhtors.length === 0) {
      alertData = "Select atleast one author";
      returnValue = false;
    }
    if (
      (isEditForm && stockItemDetails.number_of_copies == 0) ||
      (!isEditForm &&
        deletable_book_copy_ids.length === 0 &&
        ((!stockItemDetails?.new_book_number &&
          !stockItemDetails?.book_number) ||
          (stockItemDetails?.new_book_number?.length === 0 &&
            stockItemDetails?.book_number?.length === 0)))
    ) {
      alertData = "Enter atleast one book";
      returnValue = false;
    }
    if (returnValue) {
      let book = {};
      book["id"] = stockItemDetails["book_id"];
      book["title"] = stockItemDetails["title"];
      book["sub_title"] = stockItemDetails["sub_title"];
      book["category"] = stockItemDetails["category"];
      book["sub_category"] = stockItemDetails["sub_category"]
        ? stockItemDetails["sub_category"].id
        : null;
      book["publisher"] = stockItemDetails["publisher"]
        ? stockItemDetails["publisher"].id
        : null;

      book["price"] = Boolean(stockItemDetails["price"])
        ? parseFloat(stockItemDetails["price"])
        : 0;
      // book["price"] = isNaN(stockItemDetails["price"])
      // ? 0
      // : parseFloat(stockItemDetails["price"]);
      let book_detail = {};
      book_detail["id"] = stockItemDetails["book_detail_id"];
      book_detail["isbn"] = Boolean(stockItemDetails["isbn"])
        ? stockItemDetails["isbn"]
        : null;
      book_detail["edition"] = Boolean(stockItemDetails["edition"])
        ? stockItemDetails["edition"]
        : null;
      book_detail["source_vendor"] = Boolean(stockItemDetails["source_vendor"])
        ? stockItemDetails["source_vendor"]
        : null;
      book_detail["remarks"] = Boolean(stockItemDetails["remarks"])
        ? stockItemDetails["remarks"]
        : null;
      book_detail["bill_date"] = Boolean(stockItemDetails["bill_date"])
        ? dateFormat(stockItemDetails["bill_date"], "YYYY-MM-DD")
        : null;
      book_detail["year_of_publication"] =
        stockItemDetails["year_of_publication"];
      book_detail["total_pages"] = Boolean(stockItemDetails["total_pages"])
        ? parseInt(stockItemDetails["total_pages"])
        : null;
      let book_standard_mapping = []
      if (stockItemDetails["book_standard_mapping"] && stockItemDetails["book_standard_mapping"].length > 0) {
        let temp = {}
        stockItemDetails["book_standard_mapping"].map((data) => {
          temp = {}
          temp["standard"] = data.id
          temp["academic_year"] = null
          if (data["standard_id"]) {
            temp["id"] = data.standard_id
          }
          book_standard_mapping.push(temp)
        })
      }
      postData["book"] = book;
      postData["book_detail"] = book_detail;
      postData["book_standard_mapping"] = book_standard_mapping;
      postData["authors"] = this.getAuthorIds();
      stockItemDetails["book_number"] = [
        ...stockItemDetails["book_number"],
        ...stockItemDetails["new_book_number"],
      ];
      stockItemDetails["new_book_number"] = [];
      postData["book_numbers"] = stockItemDetails["book_number"];
      if (isEditForm) {
        postData["id"] = stockDetails.id;
        postData["deletable_book_copy_ids"] = deletable_book_copy_ids;
      }
      returnValue = postData;
    } else {
      openError = true;
    }
    this.setState({
      fieldErrors,
      openError,
      alertData,
      stockItemDetails,
      postData,
    });
    return returnValue;
  };

  handleSubmit = () => {
    let postData = this.validationAndPostData();
    if (postData) {
      const url = POST_URL.librarybook.api;
      const post = {
        book_list: [postData],
      };
      postRequest(url, post, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.library_books.view.url);
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleClose = () => {
    this.setState({
      openError: false,
    });
  };

  updateAuthorsValue = (stateValue) => {
    this.setState({
      selectedAuhtors: [...stateValue],
    });
  };

  handleClosePreviewBooks = () => {
    this.setState({
      isOpenReview: false,
    });
  };

  handleBookCopies = () => {
    this.setState({
      isOpenReview: true,
    });
  };

  saveBookList = (details) => {
    let { new_book_list, old_book_list, deletable_ids } = details;
    let { stockItemDetails, deletable_book_copy_ids } = this.state;
    stockItemDetails["new_book_number"] = new_book_list;
    stockItemDetails["book_number"] = old_book_list;
    if (deletable_ids) {
      deletable_book_copy_ids = [...deletable_book_copy_ids, ...deletable_ids];
    }
    if (old_book_list) {
      stockItemDetails["is_modified"] = true;
    }
    this.setState({
      stockItemDetails,
      isOpenReview: false,
      deletable_book_copy_ids,
    });
  };

  render() {
    const {
      loading,
      submitDisable,
      stockItemFieldDetails,
      authorFieldDetails,
      isEditForm,
      openError,
      alertData,
      isOpenReview,
      stockItemDetails,
      fieldErrors,
      bookId,
      autoEditDetails,
    } = this.state;
    const old_count = stockItemDetails?.new_book_number?.length ?? 0;
    const new_count = stockItemDetails?.book_number?.length ?? 0;
    let total_count = old_count + new_count;
    if (isEditForm && total_count === 0) {
      total_count = stockItemDetails.number_of_copies;
    }
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <div>
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">
                  <FormattedMessage {...messages.libBooks} />
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("library_books", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.library_books.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.library_books.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box>
              <Grid container spacing={1}>
                <Grid item md={7} xs={12}>
                  <Paper className="paper-plain-background header-align p-t-20px p-b-20px">
                    {total_count > 0 ? (
                      <div className="d-flex end-flex-prop align-items-center mt-10">
                        <TextField
                          autoComplete="off"
                          label={"Book Copies"}
                          name={"book_number"}
                          className="width-200-px"
                          value={total_count}
                          variant="outlined"
                          inputProps={{ maxLength: 8 }}
                          error={
                            fieldErrors[`num_of_copies`] &&
                            fieldErrors[`num_of_copies`]
                          }
                          helperText={
                            fieldErrors[`num_of_copies`] &&
                            fieldErrors[`num_of_copies`]
                          }
                          disabled
                          size="small"
                        />
                        <Tooltip
                          title={"Modify Book Copies"}
                          enterDelay={400}
                          enterNextDelay={400}
                          placement="top-start"
                          classes={{ tooltip: "tooltip-show-data" }}
                        >
                          <div
                            className="pl-10 pointer"
                            onClick={this.handleBookCopies}
                          >
                            <EditIcon />
                          </div>
                        </Tooltip>
                      </div>
                    ) : (
                      <div className="end-flex-prop align-items-center mt-10">
                        <Button
                          className="custom-button"
                          onClick={this.handleBookCopies}
                        >
                          Add Book Copies
                        </Button>
                      </div>
                    )}
                    <Box className="mt-10">
                      {stockItemFieldDetails && (
                        <DynamicForm
                          fieldDetails={stockItemFieldDetails}
                          updateParent={this.updateStockItemDetails}
                          isEditForm={isEditForm}
                          loading={loading}
                          ref={"stock_item"}
                          idFormat={"library_add_stock_2023_07_16_06_pm_"}
                        />
                      )}   
                    </Box>
                  </Paper>
                </Grid>
                <Grid item md={5} xs={12} className="header-align">
                  <MultipleAddTextFields
                    fieldDefaultValue={autoEditDetails}
                    fieldDetails={authorFieldDetails}
                    updateParent={this.updateAuthorsValue}
                    isEmptyNotAllowed={true}
                    ref={"author"}
                    NotAlignCenter={true}
                    idFormat={"library_auth_2023_07_16_06_pm_"}
                  />
                </Grid>
              </Grid>
              <Box className="submt-button-float-bottom" mt={3}>
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  disabled={submitDisable}
                  onClick={this.handleSubmit}
                >
                  Submit
                </Button>
              </Box>
            </Box>
          </Paper>
          {isOpenReview && (
            <PreviewBooksNew
              stockItemDetails={stockItemDetails}
              closeInParent={this.handleClosePreviewBooks}
              saveBookList={this.saveBookList}
              isEditForm={isEditForm}
              bookId={bookId}
              is_modified={stockItemDetails.is_modified}
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
        </div>
      );
    }
  }
}

export default withRouter(AddBook);
