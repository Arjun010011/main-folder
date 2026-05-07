import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Snackbar from "@material-ui/core/Snackbar";

import AddItemStore from "Containers/StoreManagement/Components/AddItemStore";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { numberRegex, numberAndDotRegex } from "Constants/regularExpression";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { Alert, isUserHasPermission } from "Includes/functions";
import DynamicForm from "Components/DynamicForm";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import _ from "lodash";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

const addStockItem_global = [
  {
    label: <FormattedMessage {...messages.storeCategorySelectCategory} />,
    regex: null,
    name: "category",
    md: 6,
    className: "width-form-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDownWithGetRequest",
    maxLength: 25,
    requestURL: GET_URL.subcategory.api,
    updateListTo: "sub_category",
    params: { category: "category" },
    view_name: "category_name",
    hideSelect: true,
  },
  {
    label: <FormattedMessage {...messages.storeSubCategorySelectCategory} />,
    regex: null,
    name: "sub_category",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDownWithSearchAndGetRequest",
    maxLength: 25,
    parent: "category",
    helperText: (
      <FormattedMessage {...messages.storeSubCategorySelectCategory} />
    ),
    view_name: "caste_name",
  },
  {
    label: <FormattedMessage {...messages.storeAvailableStock} />,
    regex: numberRegex,
    name: "available_stock",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 5,
    hidden: true,
  },
  {
    label: <FormattedMessage {...messages.storeCurrentSellingPrice} />,
    regex: numberAndDotRegex,
    name: "current_selling_price",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "amount",
    maxLength: 5,
  },
  {
    label: "Reason",
    regex: null,
    name: "reason",
    md: 12,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: 3,
    type: "multiline-text",
    maxLength: 100,
    hidden: true,
  },
  {
    label: <FormattedMessage {...messages.storeOpeningStockLabel} />,
    regex: numberRegex,
    name: "opening_stock",
    md: 6,
    className: "width-form-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 5,
  },
  {
    label: <FormattedMessage {...messages.storeAlertMinStockLabel} />,
    regex: null,
    name: "is_min_stock",
    md: 6,
    className: "width-form-100",
    id: "outlined-textarea",
    default: false,
    rows: null,
    type: "switch",
    dependentChildren: ["min_stock"],
    boolean: true,
  },
  {
    label: <FormattedMessage {...messages.storeMinStockLabel} />,
    regex: numberRegex,
    name: "min_stock",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    dependentParent: "is_min_stock",
    maxLength: 5,
  },
];

const editableFields = ["current_selling_price", "available_stock", "reason"];

class AddStockItems extends Component {
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
      stockItemDetails: {},
      propertyValueList: {},
      selectedItem: {},
      loading: true,
      subCategoryList: [],
      canModifyStock: true,
    };
  }

  componentDidMount = () => {
    this.getCategoryList();
    this.getPropertyList();
    this.addItemStoreRef = React.createRef();
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
    } = this.state;
    let fieldDetail = _.cloneDeep(addStockItem_global);
    let value;
    fieldDetail.forEach((field) => {
      if (
        stockDetails &&
        (stockDetails[field.name] || stockDetails[field.name] == 0)
      ) {
        value = stockDetails[field.name];
      } else {
        value = field.default;
      }
      field.default = value;
      if (field.name === "category") {
        field.list = categoryList;
      }
      if (stockDetails && field.name === "sub_category") {
        subCategoryList.map((data) => {
          if (data["id"] === stockDetails?.sub_category) {
            value = data;
          }
        });
        field.list = subCategoryList;
      }
      if (field.name === "is_min_stock") {
        field.hidden = !canModifyStock;
        if (stockDetails?.min_stock > 0) {
          value = true;
        }
      }
      if (field.name === "available_stock" || field.name === "reason") {
        field.hidden = canModifyStock;
        field.required = false;
      }
      if (!editableFields.includes(field.name)) {
        field.disabled = !canModifyStock;
        if (field.name === "opening_stock") {
          field.required = false;
        }
      }
      stockItemDetails[field["name"]] = value;
      field.default = value;
    });
    if (stockDetails?.property_values.length > 0) {
      let temp = { selectedProperty: "", selectedPropertyValue: "" };
      stockDetails.property_values.map((data) => {
        temp = { selectedProperty: "", selectedPropertyValue: "" };
        propertiesList.map((propData) => {
          if (data.properties === propData["id"]) {
            temp["selectedProperty"] = propData;
          }
        });
        this.getPropertyValue(data.properties);
        propertyValueList[temp["selectedProperty"]] = data;
        temp["selectedPropertyValue"] = data;
        propertyList.push(temp);
      });
    }
    if (stockDetails) {
      selectedItem["name"] = stockDetails.item_name;
      selectedItem["code"] = stockDetails.item_code;
      selectedItem["id"] = stockDetails.item;
    }

    this.setState({
      stockItemDetails,
      stockItemFieldDetails: fieldDetail,
      propertyValueList,
      propertyList,
      selectedItem,
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

  getCategoryList = () => {
    const url = GET_URL.storecategory.api;
    const params = { is_active: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          categoryList: response.data.data,
        });
      }
    });
  };

  getSubCategoryList = (id) => {
    const url = GET_URL.subcategory.api;
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

  getStockDetails = (id) => {
    const g_url = GET_URL.stock.api;
    const params = id + "/";
    const url = g_url + params;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.getSubCategoryList(response.data.data.category);
        this.setState({
          stockDetails: response.data.data,
          canModifyStock: false,
          // canModifyStock: !(
          //   response.data.item_issued_data.total_items ||
          //   response.data.item_purchased_data.total_items
          // ),
        });
      }
    });
  };

  getPropertyList = () => {
    const url = GET_URL.properties.api;
    const params = { is_active: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            propertiesList: response.data.data,
          },
          () => {
            if (
              this.props.location.pathname ===
              Actions.store_stock_items.update.url
            ) {
              if (
                this.props.location.state &&
                this.props.location.state.detail
              ) {
                this.getStockDetails(this.props.location.state.detail);
              } else {
                this.props.history.push(Actions.store_stock_items.view.url);
              }
            } else {
              this.updateStockItemFieldDetails();
            }
          }
        );
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
      if (!propertyList[pIndex].selectedPropertyValue) {
        fieldErrors[`selectedPropertyValue${pIndex}`] = (
          <FormattedMessage {...messages.storeSelectValue} />
        );
        returnValue = false;
      }
      if (!propertyList[pIndex].selectedProperty) {
        fieldErrors[`selectedProperty${pIndex}`] = (
          <FormattedMessage {...messages.storeSelectProperty} />
        );
        returnValue = false;
      }
    }
    this.setState({
      fieldErrors,
    });
    if (returnValue) {
      returnValue = returnPropertyValueIDs;
    }
    return returnValue;
  };

  handleAddProperty = () => {
    let { fieldErrors, propertyList } = this.state;
    let validate = this.validateDuplicate();
    if (validate) {
      let temp = { selectedProperty: "" };
      propertyList.push(temp);
      this.setState({
        propertyList,
        fieldErrors,
      });
    }
  };

  handleDeleteProperty = (index) => {
    let { fieldErrors, propertyList } = this.state;
    propertyList.splice(index, 1);
    fieldErrors = {};
    this.setState({
      propertyList,
      fieldErrors,
    });
  };

  handleDropDownWithSearchChange = (e, newValue, name, index) => {
    let { propertyList, fieldErrors } = this.state;
    propertyList[index][name] = newValue;
    if (name == "selectedProperty") {
      propertyList[index]["selectedPropertyValue"] = "";
      this.getPropertyValue(newValue.id);
    }
    fieldErrors = {};
    this.setState({
      propertyList,
      fieldErrors,
    });
  };

  getPropertyValue = (id) => {
    let { propertyValueList } = this.state;
    if (!propertyValueList[id]) {
      const url = GET_URL.propertyvalue.api;
      const params = { is_active: 1, properties: id };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          propertyValueList[id] = response.data.data;
          this.setState({
            propertyValueList,
            loading: false,
          });
        }
      });
    }
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

  validationAndPostData = () => {
    let {
      stockItemDetails,
      stockItemFieldDetails,
      fieldErrors,
      selectedItem,
      alertData,
      openError,
      canModifyStock,
      isEditForm,
      stockDetails,
    } = this.state;
    let validateValue = true;
    let returnValue = true;
    let postData = {};
    stockItemFieldDetails.map((field) => {
      let value = stockItemDetails[field.name];
      let name = field.name;
      if (!field.hidden && field.required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        validateValue = false;
      } else if (
        field.dependentParent &&
        stockItemDetails[field.dependentParent] &&
        !Boolean(value)
      ) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        validateValue = false;
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        Boolean(value)
      ) {
        fieldErrors[name] = field.regex.errorText;
        validateValue = false;
      }
    });
    let duplicateValue = this.validateDuplicate();
    if (!validateValue) {
      this.refs.stock_item.updateErrors(fieldErrors);
    }
    if (!selectedItem.id) {
      validateValue = false;
      openError = true;
      alertData = "Add Item";
    }
    if (!duplicateValue || !validateValue) {
      returnValue = false;
    } else {
      postData["category"] = stockItemDetails["category"];
      postData["sub_category"] = stockItemDetails["sub_category"]
        ? stockItemDetails["sub_category"].id
        : null;
      postData["property_value"] = duplicateValue;
      postData["available_stock"] = !canModifyStock
        ? stockItemDetails["available_stock"]
        : stockItemDetails["opening_stock"];
      if (canModifyStock) {
        postData["item"] = selectedItem.id;
        postData["opening_stock"] = !canModifyStock
          ? stockItemDetails["available_stock"]
          : stockItemDetails["opening_stock"];
      }
      postData["current_selling_price"] =
        stockItemDetails["current_selling_price"];
      postData["min_stock"] = stockItemDetails["is_min_stock"]
        ? stockItemDetails["min_stock"]
        : 0;
      postData["reason"] = stockItemDetails?.["reason"] ?? "";
      if (isEditForm) {
        postData["id"] = stockDetails.id;
      }
      returnValue = postData;
    }
    this.setState({
      fieldErrors,
      openError,
      alertData,
    });
    return returnValue;
  };

  submit = () => {
    const { isEditForm } = this.state;
    let postData = this.validationAndPostData();
    if (postData) {
      this.setState({ submitDisable: true });
      if (!isEditForm) {
        let url = POST_URL.stock.api;
        postRequest(url, postData, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            });
            this.props.history.push(Actions.store_stock_items.view.url);
          }
          this.setState({ submitDisable: false });
        });
      } else {
        let url = PUT_URL.stock.api + postData["id"] + "/";
        putRequest(url, postData, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            });
            this.props.history.push(Actions.store_stock_items.view.url);
          }
          this.setState({ submitDisable: false });
        });
      }
    }
  };

  handleClose = () => {
    this.setState({
      openError: false,
    });
  };

  render() {
    const {
      loading,
      submitDisable,
      stockItemFieldDetails,
      selectedItem,
      fieldErrors,
      isEditForm,
      openError,
      alertData,
      propertyList,
      propertiesList,
      propertyValueList,
      canModifyStock,
    } = this.state;
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
                  <FormattedMessage {...messages.addStockItemHeading} />
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("store_stock_items", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.store_stock_items.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.store_stock_items.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <AddItemStore
              ref={this.addItemStoreRef}
              selectedItem={this.selectedItem}
              canModifyStock={canModifyStock}
            />
            <Box>
              <Grid container spacing={1}>
                <Grid item md={propertyList.length == 0 ? 8 : 6} xs={12}>
                  <Paper className="paper-plain-background header-align p-t-20px p-b-20px">
                    <Box className="margin-top-20">
                      {stockItemFieldDetails && (
                        <DynamicForm
                          fieldDetails={stockItemFieldDetails}
                          updateParent={this.updateStockItemDetails}
                          isEditForm={isEditForm}
                          loading={loading}
                          ref={"stock_item"}
                          idFormat={"store_add_stock_2022_08_11_01_23_pm_"}
                        />
                      )}
                    </Box>
                    <Box className="flex-justify-space-between ">
                      <Box>
                        {!selectedItem.name &&
                          !selectedItem.code &&
                          canModifyStock && (
                            <Button
                              className="add-modify-button"
                              onClick={(e) => this.openItemList()}
                            >
                              <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                              <FormattedMessage
                                {...messages.storeAddItemLabel}
                              />
                            </Button>
                          )}
                        {selectedItem.name &&
                          selectedItem.code &&
                          canModifyStock && (
                            <Button
                              className="add-modify-button"
                              onClick={(e) => this.openItemList()}
                            >
                              <EditOutlinedIcon className="visibility-icon" />
                              <FormattedMessage
                                {...messages.storeChangeItemLabel}
                              />
                            </Button>
                          )}
                      </Box>
                      {selectedItem.name && selectedItem.code && (
                        <Box
                          display="flex"
                          className="flex-justify-center-flex-prop"
                        >
                          <Box className="exam-mark-heading-box">
                            {" "}
                            <FormattedMessage {...commonMessages.name} />
                          </Box>
                          <Box className=" exam-mark-add-heading-bg">
                            {selectedItem.name}
                          </Box>
                          <Box className="exam-mark-heading-box">
                            {" "}
                            <FormattedMessage {...commonMessages.code} />
                          </Box>
                          <Box className=" exam-mark-add-heading-bg">
                            {selectedItem.code}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item md={propertyList.length == 0 ? 3 : 6} xs={12}>
                  <Paper className="paper-plain-background header-align p-t-20px p-b-20px">
                    {propertyList.length == 0 && (
                      <Box className="text-align-last-center">
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={() => this.handleAddProperty()}
                        >
                          <FormattedMessage {...messages.storeAddProperties} />
                        </Button>
                      </Box>
                    )}
                    {propertyList.length > 0 &&
                      propertyList.map((data, index) => {
                        return (
                          <Grid container spacing={2}>
                            <Grid item md={5} xs={5}>
                              <DropDownWithSearch
                                id="combo-box-demo"
                                options={propertiesList}
                                value={data.selectedProperty}
                                onChange={(e, newValue) =>
                                  this.handleDropDownWithSearchChange(
                                    e,
                                    newValue,
                                    "selectedProperty",
                                    index
                                  )
                                }
                                name="selectedProperty"
                                label={
                                  <FormattedMessage
                                    {...messages.storeProperty}
                                  />
                                }
                                optionValue="name"
                                className="width-100"
                                required={true}
                                helperText={
                                  data.selectedProperty
                                    ? ``
                                    : fieldErrors[`selectedProperty${index}`]
                                }
                                error={fieldErrors[`selectedProperty${index}`]}
                                hideClearIcon={true}
                              />
                            </Grid>
                            <Grid item md={5} xs={5}>
                              <DropDownWithSearch
                                id="combo-box-demo"
                                options={
                                  propertyValueList[data.selectedProperty.id]
                                    ? propertyValueList[
                                        data.selectedProperty.id
                                      ]
                                    : []
                                }
                                value={data.selectedPropertyValue}
                                onChange={(e, newValue) =>
                                  this.handleDropDownWithSearchChange(
                                    e,
                                    newValue,
                                    "selectedPropertyValue",
                                    index
                                  )
                                }
                                name="selectedPropertyValue"
                                label={
                                  <FormattedMessage {...commonMessages.value} />
                                }
                                optionValue="name"
                                disabled={data.selectedProperty ? false : true}
                                className="width-100"
                                required={true}
                                helperText={
                                  data.selectedPropertyValue
                                    ? ``
                                    : fieldErrors[
                                        `selectedPropertyValue${index}`
                                      ]
                                }
                                error={
                                  fieldErrors[`selectedPropertyValue${index}`]
                                }
                                hideClearIcon={false}
                              />
                            </Grid>

                            <Grid
                              item
                              md={2}
                              xs={2}
                              className="propertyvalue-padding"
                            >
                              <Box className="display-flex">
                                <Box>
                                  <Button
                                    color="secondary"
                                    className="min-max-w-0"
                                  >
                                    <DeleteOutlineIcon
                                      onClick={() =>
                                        this.handleDeleteProperty(index)
                                      }
                                      className="add-icon-stock-item"
                                    />
                                  </Button>
                                </Box>
                                {(propertyList.length == index + 1 ||
                                  propertyList.length == 1) && (
                                  <Box>
                                    <Button
                                      color="primary"
                                      className="min-max-w-0"
                                    >
                                      <AddCircleOutlineIcon
                                        onClick={() => this.handleAddProperty()}
                                        className="add-icon-stock-item"
                                      />
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        );
                      })}
                  </Paper>
                </Grid>
              </Grid>
              <Grid item md={12}>
                <Box
                  display="flex"
                  marginLeft="auto"
                  justifyContent="flex-end"
                  className="header-align"
                >
                  <Button
                    variant="contained"
                    color="primary"
                    className="submit"
                    disabled={submitDisable}
                    onClick={this.submit}
                  >
                    <FormattedMessage {...commonMessages.submit} />
                  </Button>
                </Box>
              </Grid>
            </Box>
          </Paper>
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

export default withRouter(AddStockItems);
