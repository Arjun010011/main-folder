import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import { Grid, Paper, Box, Button, Tooltip, TextField, Dialog, DialogTitle, DialogContent, IconButton } from "@material-ui/core";
import Snackbar from "@material-ui/core/Snackbar";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import CloseIcon from "@material-ui/icons/Close";
import { cloneDeep } from "lodash";

import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import {
  getFullName,
  Alert,
  isUserHasPermission,
  getUrlParam,
  printPDF,
  validateDate,
  dateFormat,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import FeeCollectionStudentProfile from "Containers/Finance/Components/FeeCollectionStudentProfile";
import FeeCollectionDetailedView from "Containers/Finance/Components/FeeCollectionDetailedView";
import FeeCollectionInvoiceView from "Containers/Finance/FeeCollectionInvoiceView";
import PaymentModal from "Components/paymentModal";
import AdjustmentModal from "Components/AdjustmentModal";
import QuickPayModal from "Containers/Finance/QuickPayModal";
import { minDate } from "Constants";
import { FormattedMessage } from "react-intl";
import Swal from "sweetalert2";
import _ from "lodash";
import messages from "./messages";
import commonMessages from "Constants/messages";
import EnableFeaturePopup from "Containers/Finance/Components/EnableFeaturePopup";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import FeeCollectionDiscount from "Containers/Finance/Components/FeeCollectionDisount";
import FeeCollectionDiscountList from "Containers/Finance/Components/FeeCollectionDiscountList";
import {
  isQuickFeeModal,
  isFormDefinitionEnabled,
} from "Includes/CheckFormDefinition";
import FeeCollectionStoreIssue from "./FeeCollection/FeeCollectionStoreIssue";
import StudentFeePaidHistoryModal from "./Components/StudentFeePaidHistoryModal";
import PaymentModalNew from "Components/PaymentModalNew";
import { Autocomplete } from "@material-ui/lab";
import "./FeeCollectionNew.scss";

class FeeCollectionNew extends Component {
  constructor() {
    super();
    this.state = {
      yearid: "",
      standardid: "",
      studentid: "",
      feePlan: [],
      originalFeePlan: [],
      groupList: [],
      fee_group_plan: {},
      discount_ids: [],
      studentData: {},
      disableSubmit: false,
      updatedPostData: [],
      updatedStorePostData: [],
      updateSelectedData: [],
      adjustmentDeleteData: [],
      openPaymentModal: false,
      alertData: "",
      totalAmount: 0,
      totalAmountPaid: 0,
      total_discount: 0,
      adjustmentData: [],
      is_quick_fee_modal: isQuickFeeModal(),
      loading: true,
      feeSummary: {},
      enabledActions: [],
      adjustmentEnabled: false,
      openDisountPage: false,
      initialSelect: true,
      selectedGroup: "",
      isSelectSamePage: false,
      additionalList: {},
      totalAdditionalPay: 0,
      additionalModeOfPay: "",
      showFeePaidHistory: false,
      openStudentAdjustmentPopup: false,
      updateFeePlan: false,
      totalConcession: 0,
      is_mode_of_pay_multiple: true,
      areaList: [],
      selected_area_id: "",
      selected_area: null,
      studentUserId: null,
      invoiceFields: [
        { name: "Fee Type", key: "feetype_name", is_amount: false },
        { name: "Term", key: "terms", is_amount: false },
        { name: "Amount", key: "amount_paid", is_amount: true },
      ],
      concessIonInvoiceFields: [
        { name: "Concession ", key: "concessionAmount", is_amount: true },
        {
          name: <FormattedMessage {...messages.payableAmount} />,
          key: "payable_amount",
          is_amount: true,
        },
      ],
      isPaidFullFee: true,
      openAdjustmentModal: false,
      adjustmentSaveBlocked: false,
      adjustmentPermission: false,
      openQuickPayModal: true,
      updatingConcession: false,
      enabledConcession: false,

      is_fee_group_enabled: isFormDefinitionEnabled(
        "fee_configurations",
        "fee_type_view_web",
        3
      ),
      is_term_wise_view: isFormDefinitionEnabled(
        "fee_configurations",
        "fee_type_view_web",
        2
      ),
      enable_manual_receipt_num: isFormDefinitionEnabled(
        "fee_configurations",
        "enable_manual_receipt_num",
        1
      ),
      show_student_previous_year_fee_in_feecollection: isFormDefinitionEnabled(
        "fee_configurations",
        "show_student_previous_year_fee_in_feecollection",
        1
      ),
      show_sibling_fee_details_in_feecollection: isFormDefinitionEnabled(
        "fee_configurations",
        "show_sibling_fee_details_in_feecollection",
        1
      ),
      alias_names: JSON.parse(localStorage.getItem("alias_name"))
        ? JSON.parse(localStorage.getItem("alias_name"))
        : {},
      user: localStorage.getItem("user") != "undefined"
        ? JSON.parse(localStorage.getItem("user"))
        : [],
      is_adjustment_request: isFormDefinitionEnabled(
        "fee_configurations",
        "adjustment_approval_enabled",
        1
      ),
      // is_adjustment_approval: isUserHasPermission('fee_adjustment_approval', 'create'),
      is_adjustment_approval: false,
      discountList: [],
      is_enabled_submit: true,
      isSamePage: false,
      originalInvoiceFields: [
        { name: "Fee Type", key: "feetype_name", is_amount: false },
        { name: "Term", key: "terms", is_amount: false },
        { name: "Amount", key: "amount_paid", is_amount: true },
      ],
      termFeePlanNew: {},
      receiptDetails: {
        receipt_date: new Date(),
        is_enabled: false,
      },
      studentPendingFeeList: [],
      siblingPendingFeeList: [],
      refreshKey: 0,
      selectedAcademicYear: null,
      isTransportPlan: false,
    };
  }
  

  async componentDidMount() {

    this.updatePermissions();
    let currentSelectedList = getUrlParam();

    if (this.props.location.pathname === Actions.fee_adjustment.create.url) {
      this.setState({ adjustmentEnabled: true });
    }
    console.log('--------------------------------->', this.state.show_sibling_fee_details_in_feecollection)

    if (
      !("yearid" in currentSelectedList) ||
      !("standardid" in currentSelectedList) ||
      !("studentid" in currentSelectedList)
    ) {
      this.props.history.push(Actions.fee_collection.view.url);
    } else {
      const { yearid, standardid, studentid, quickpay } = currentSelectedList;
      let tempModal = false;
      if (quickpay === "true") {
        tempModal = true;
      }
      this.setState(
        {
          yearid: yearid,
          standardid: standardid,
          studentid: studentid,
          openQuickPayModal: tempModal,
        },
        () => {
          // MOVED HERE: Now 'studentid' and 'yearid' are available in state
          this.getFeePlan();
          
          try {
            if (this.state.show_student_previous_year_fee_in_feecollection) {
              this.getStudentDetails();
            }
            console.log('here2')
            if (this.state.show_sibling_fee_details_in_feecollection) {
              this.getSiblingPendingFeeList();
            }
          } catch (err) {
            console.log('catching error because this function not disturb the fee collection')
          }
        }
      );
    }
  }

  getInstituteList = () => {
    // FIX: Changed studentId -> studentid, year -> yearid
    let { studentid, yearid, map_address_data } = this.state;

    const url = GET_URL.instituteaddress.api

    // FIX: Updated params to use the correct variables
    const params = { is_active: true, student: studentid, academic_year: yearid }

    getRequest(url, params, this.props).then(response => {
      if (response && response.status === 200) {
        if (response.data.data.map_address_data) {
          map_address_data = {
            latitude_map: parseFloat(response.data.data.map_address_data.latitude_map),
            longitude_map: parseFloat(response.data.data.map_address_data.longitude_map)
          }
        }
        this.setState({
          institute_address: response.data.data.id,
          map_address_data
        }, () => {
          this.getAreaList()
        })
      }
    })
  }
  validation = () => {
    let { fieldErrors, routeDetails, year, userId, institute_address, isEditForm, id, studentUserId, } = this.state;
    let return_data = true
    if (routeDetails.isArea) {
      if (!routeDetails.selected_area) {
        fieldErrors['selected_area'] = 'This field is mandatory'
        return_data = false
      }
    }
    else {
      if (!routeDetails.address_one_map) {
        fieldErrors['address_one_map'] = 'This field is mandatory'
        return_data = false
      }
    }

    return_data = {
      academic_year: year,
      user: parseInt(studentUserId),
      area_datas: {}
    };
    console.log('--------------------------------->', studentUserId)

    if (isEditForm) {
      return_data['id'] = parseInt(id)
    }
    if (routeDetails.isArea) {
      return_data['area'] = routeDetails.selected_area.id
    }
    else {
      if (!routeDetails.selected_route) {
        fieldErrors[`select`] = 'Select best route'
        return_data = false
      }
      else {
        return_data['area_datas']['address_one'] = routeDetails.address_one_map
        return_data['area_datas']['address_two'] = routeDetails.address_two_map
        return_data['area_datas']['city'] = routeDetails.city_map
        return_data['area_datas']['district'] = routeDetails.district_map
        return_data['area_datas']['state'] = routeDetails.state_map
        return_data['area_datas']['country'] = routeDetails.country_map
        return_data['area_datas']['pincode'] = routeDetails.pincode_map
        return_data['area_datas']['km'] = routeDetails.selected_route.distance
        return_data['area_datas']['institute_address'] = institute_address
        return_data['area_datas']['landmark'] = routeDetails.land_mark
        return_data['area_datas']['latitude'] = routeDetails.latitude_and_langitude_map.lat
        return_data['area_datas']['longitude'] = routeDetails.latitude_and_langitude_map.lng
      }
    }
    this.setState({
      fieldErrors
    })
    if (return_data) {
      return return_data
    }
    else {
      return false
    }
  }


  submit = () => {
    const { isEditForm, id } = this.state;
    const validation_post_load = this.validation()
    if (validation_post_load) {
      if (isEditForm) {
        const url = PUT_URL.routeuseraddress.api + '' + id + '/';
        putRequest(url, validation_post_load).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: 'top-end',
              type: 'success',
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500
            })
            this.props.history.push(Actions.transport_student_address_registration.view.url);
          }
          this.setState({
            submitDisable: false
          })
        })
      }
      else {
        const url = POST_URL.routeuseraddress.api;
        postRequest(url, validation_post_load).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: 'top-end',
              type: 'success',
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500
            })
            this.props.history.push(Actions.transport_student_address_registration.view.url);
          }
          this.setState({
            submitDisable: false
          })
        })
      }
    }
  }

  getAreaList = () => {
    let { institute_address, loading, isEditForm } = this.state;
    const url = GET_URL.area.api;
    const params = { is_active: 1, institute_address: institute_address, area_type: 1 }
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        if (!isEditForm) {
          loading = false
        }
        this.setState({
          areaList: response.data.data,
          loading
        }, () => {
          if (isEditForm) {
            this.editPageData()
          }
        })
      }
    })
  }

  getStudentDetails = () => {
    let { studentid } = this.state
    let totalAmount = 0;
    const postData = {
      student_ids: [parseInt(studentid)],
    };
    postRequest(POST_URL.getfeelistforstudent.api, postData, this.props).then(
      (response) => {
        try {
          if (response && response.status === 200) {
            let temp_totalAmount = { ...totalAmount };
            temp_totalAmount["pending"] = 0;
            let temp_pending_list = []
            if (response.data.data?.[studentid]) {
              for (const data of response.data.data?.[studentid]) {
                const d1 = new Date(data['start_date']);
                const d2 = new Date(this.state.selectedAcademicYear['start_date'])
                if (d1 < d2 && data['pending_amount'] > 0) {
                  temp_pending_list.push(data)
                }
              }
            }
            this.setState({
              studentPendingFeeList: temp_pending_list
            })
          }
        } catch (err) {
          console.log(err)
        }
      }
    );
  };

  getSiblingPendingFeeList = () => {
    let { studentid } = this.state
    const postData = {
      student_id: parseInt(studentid),
      show_only_pending_sibling: true
    };
    postRequest(POST_URL.getsiblingfeelist.api, postData, this.props).then(
      (response) => {
        try {
          if (response && response.status === 200) {
            this.setState({
              siblingPendingFeeList: response.data.sibling_fee_data
            })
            console.log('--------------------------------->', response.data.sibling_fee_data)
          }
        } catch (err) {
          console.log(err)
        }
      }
    );
  }

  validatePayingFees = () => {
    let {
      updatedPostData,
      enabledConcession,
      discountList,
      total_discount,
      is_term_wise_view,
      is_fee_group_enabled,
      selectedGroup,
      receiptDetails,
      enable_manual_receipt_num,
    } = this.state;
    let totalAmount = 0;
    let response = { Result: true };
    let postData = [];
    let errorFound = false;
    if (receiptDetails["is_enabled"]) {
      if (
        !receiptDetails["receipt_num"] &&
        isUserHasPermission("manual_receipt", "create") &&
        enable_manual_receipt_num
      ) {
        this.setState({
          alertData: (
            <FormattedMessage {...messages.enterReceiptNumberToProceed} />
          ),
          snackbar: true,
          severity: "error",
        });
        response["Result"] = false;
        return response;
      } else if (
        !receiptDetails["receipt_date"] &&
        isUserHasPermission("manual_receipt_date", "create")
      ) {
        this.setState({
          alertData: (
            <FormattedMessage {...messages.enterReceiptDateToProceed} />
          ),
          snackbar: true,
          severity: "error",
        });
        response["Result"] = false;
        return response;
      } else if (receiptDetails["receipt_date"]) {
        let error_date = validateDate(
          receiptDetails["receipt_date"],
          minDate,
          new Date()
        );
        if (error_date) {
          this.setState({
            alertData: error_date,
            snackbar: true,
            severity: "error",
          });
          response["Result"] = false;
          return response;
        }
      }
    }
    if (updatedPostData.length === 0) {
      this.setState({
        alertData: <FormattedMessage {...messages.enterAmountToProceed} />,
        snackbar: true,
        severity: "error",
      });
      response["Result"] = false;
      return response;
    }
    updatedPostData.map((feeData) => {
      if (
        !is_fee_group_enabled ||
        (is_fee_group_enabled &&
          feeData.fee_group === selectedGroup["fee_group"])
      ) {
        feeData["standard_fee"].map((termData, termIndex) => {
          //check previous term fees is paid or not
          if (
            !errorFound &&
            termIndex &&
            termData["is_checked"] &&
            feeData["standard_fee"][termIndex - 1]["pending_amount"] > 0 &&
            !is_term_wise_view &&
            (Math.abs(
              feeData["standard_fee"][termIndex - 1]["pending_amount"] -
              feeData["standard_fee"][termIndex - 1]["amount_paid"]
            ) ||
              !feeData["standard_fee"][termIndex - 1]["is_checked"])
          ) {
            this.setState({
              alertData: `${feeData["fee_type_name"]} -  ${feeData["standard_fee"][termIndex]?.["term_alias"] ??
                feeData["standard_fee"][termIndex]["terms"]
                } fee cannot be paid until ${feeData["standard_fee"][termIndex - 1]["terms"]
                } fee is fully paid`,
              snackbar: true,
              severity: "error",
            });
            errorFound = true;
          }
          if (!errorFound && termData["is_checked"]) {
            if (
              parseFloat(termData["amount_paid"]) >
              parseFloat(termData["pending_amount"])
            ) {
              this.setState({
                alertData: `Paybale amount is greater than pending amount in ${feeData["fee_type_name"]}`,
                snackbar: true,
                severity: "error",
              });
              errorFound = true;
            }
            if (!errorFound && termData["amount_paid"] == 0) {
              this.setState({
                alertData: `Paybale amount Should be greater than 0 for  ${feeData["fee_type_name"]}`,
                snackbar: true,
                severity: "error",
              });
              errorFound = true;
            }
            if (!errorFound) {
              let temp = { amount_paid: termData["amount_paid"] };
              totalAmount +=
                enabledConcession && termData?.["concessionAmount"]
                  ? parseFloat(
                    termData["amount_paid"] - termData?.["concessionAmount"]
                  )
                  : parseFloat(termData["amount_paid"]);
              postData.push(temp);
            }
          }
        });
      }
    });
    if (!errorFound && totalAmount <= 0) {
      this.setState({
        alertData: <FormattedMessage {...messages.enterAmountToProceed} />,
        snackbar: true,
        severity: "error",
      });
      response["Result"] = false;
      return response;
    }
    if (!errorFound && totalAmount < total_discount) {
      this.setState({
        alertData: "Discount amount is greater than total amount",
        snackbar: true,
        severity: "error",
      });
      response["Result"] = false;
      return response;
    }
    if (errorFound) {
      response["Result"] = false;
    } else {
      let total_temp = totalAmount;
      if (discountList.length > 0) {
        total_temp = parseFloat(totalAmount) - parseFloat(total_discount);
      }
      response["totalAmount"] = total_temp;
      response["total_discount"] = total_discount;
      response["data"] = postData;
    }
    return response;
  };

  validateAdjustment = (data) => {
    let { updatedPostData } = this.state;
    let response = { Result: true };
    let postData = [];
    let deletable_ids = [];
    let totalAmount = 0;
    let deletedAdjustmentAmount = 0;
    let errorFound = false;
    if (updatedPostData.length < 0) {
      this.setState({
        alertData: <FormattedMessage {...messages.enterAmountToProceed} />,
        snackbar: true,
        severity: "error",
      });
      response["Result"] = false;
      return response;
    }
    updatedPostData.map((feeData) => {
      feeData["standard_fee"].map((termData, termIndex) => {
        deletedAdjustmentAmount = 0;
        if (!errorFound && termData["is_checked"]) {
          if (
            !termData?.["adjustment_deletable_ids"] &&
            !termData["is_addition"] &&
            parseFloat(termData["adjust_amount_new"]) >
            parseFloat(termData["pending_without_adjustment"])
          ) {
            this.setState({
              alertData: `Adjustable amount is greater than pending amount in ${feeData["fee_type_name"] || termData["fee_type_name"]
                }`,
              snackbar: true,
              severity: "error",
            });
            errorFound = true;
          }
          if (
            !termData?.["adjustment_deletable_ids"] &&
            !errorFound &&
            !Boolean(termData["adjust_amount_new"])
          ) {
            feeData["adjust_amount_error"] =
              "Paybale amount Should be greater than 0";
            this.setState({
              alertData: `Adjustable amount Should be greater than 0 for  ${feeData["fee_type_name"] || termData["fee_type_name"]
                }`,
              snackbar: true,
              severity: "error",
            });
            errorFound = true;
          }
          if (termData?.["adjustment_deletable_ids"]) {
            deletable_ids = [
              ...deletable_ids,
              ...termData?.["adjustment_deletable_ids"],
            ];
            termData["adjustment_list_temp"].map((adjust_data) => {
              if (
                termData["adjustment_deletable_ids"].includes(adjust_data.id)
              ) {
                deletedAdjustmentAmount += adjust_data.is_addition
                  ? parseFloat(adjust_data.amount)
                  : -parseFloat(adjust_data.amount);
              }
            });
            let adjustmentNewAmount = 0;
            if (termData["adjust_amount_new"]) {
              adjustmentNewAmount =
                termData["type"] === "decrement"
                  ? parseFloat(termData["adjust_amount_new"])
                  : -parseFloat(termData["adjust_amount_new"]);
            }
            let updatedAmount =
              parseFloat(termData["amount"]) -
              parseFloat(deletedAdjustmentAmount) -
              parseFloat(termData["paid_amount"] + adjustmentNewAmount);
            if (updatedAmount < 0) {
              this.setState({
                alertData: `Trying to delete adjustable amount ${deletedAdjustmentAmount} which already paid ${termData["paid_amount"]} then pending amount is ${updatedAmount} which is less than 0`,
                snackbar: true,
                severity: "error",
              });
              errorFound = true;
            }
          }
          if (!errorFound && termData?.["adjust_amount_new"] > 0) {
            let temp = {
              adjust_amount: parseFloat(termData["adjust_amount_new"]),
              fee_plan: termData["id"],
              term_name: termData["terms"],
              fee_type_name: feeData["fee_type_name"],
            };
            if (termData.is_addition) {
              temp["is_addition"] = 1;
            } else {
              temp["is_addition"] = 0;
            }
            if (termData["adjustment_reason"]) {
              temp["adjustment_reason"] = termData["adjustment_reason"];
            }
            if (termData.fee_type_name) {
              temp["fee_type_name"] = termData.fee_type_name;
            }
            totalAmount += parseFloat(termData["adjust_amount_new"]);
            postData.push(temp);
          }
        }
      });
    });
    if (!errorFound && totalAmount < 0) {
      this.setState({
        alertData: <FormattedMessage {...messages.enterAmountToProceed} />,
        snackbar: true,
        severity: "error",
      });
      response["Result"] = false;
      return response;
    }
    if (errorFound) {
      response["Result"] = false;
      this.setState({ updatedPostData });
    } else {
      response["data"] = postData;
      response["deletable_ids"] = deletable_ids;
    }
    return response;
  };

  updatePermissions = (name) => {
    const hasViewPermission = isUserHasPermission("fee_collection", "view");
    const hasAddPermission = isUserHasPermission("fee_collection", "create");
    const hasAdjustmentPermission = isUserHasPermission(
      "fee_adjustment",
      "create"
    );
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    } else {
      this.props.history.push(Actions.fee_collection.view.url);
    }
    if (hasAddPermission) {
      enabledActions.push("create");
    }
    this.setState({
      enabledActions: enabledActions,
      adjustmentPermission: hasAdjustmentPermission,
    });
  };

  getFeePlan = () => {
    return new Promise((resolve) => {
    const { studentid, yearid, standardid, is_fee_group_enabled } = this.state;
    let localIsPaidFullFee = false;
    let params = {
      academic_year: yearid,
      standard: standardid,
      student: studentid,
      update_payment_status: 1,
    };
    getRequest(GET_URL.feeplan.api, params, this.props).then((response) => {
      let feePlan = [];
      let groupList = [];
      let fee_group_plan = {};
      let studentData = {};
      let selectedGroup = "";
      let totalPaidAmount = 0;
      let studentUserId = null;
      if (response && response.status === 200) {
        feePlan = response.data.data.plans;
        if (
          is_fee_group_enabled &&
          response.data.data?.fee_group_list &&
          Object.keys(response.data.data?.fee_group_list).length > 0
        ) {
          groupList = response.data.data.fee_group_list;
          fee_group_plan = response.data.data.fee_group_plan;
          selectedGroup = response.data.data?.fee_group_list
            ? response.data.data?.fee_group_list[
            Object.keys(response.data.data?.fee_group_list)[0]
            ]
            : {};
        }
        localIsPaidFullFee = response.data.data["is_paid_full_fee"];
        if (feePlan) {
          feePlan.map((data) => {
            data["is_checked"] = false;
            data["standard_fee"].map((termData) => {
              termData["amount_paid"] = termData["pending_amount"];
              termData["adjustment_list_temp"] = termData["adjustment_list"];
              termData["is_checked"] = false;
              if (termData["paid_amount"]) {
                totalPaidAmount += termData["paid_amount"];
              }
            });
          });
        }
        response.data.data.student["year_name"] =
          response.data.data?.academic_year_data?.name;
        studentData = response.data.data.student;
        studentUserId = response.data.data.student.user_student;
        let isTransportPlan = false;

        response.data.data.plans.forEach((data) => {
          if (data.codename === "transport") {
            isTransportPlan = true;
          }
        });

        this.setState({ isTransportPlan });

        if (isTransportPlan) {
          this.getInstituteList();
        }
        let feeSummary = {
          total_concession_amount: response.data.data.total_concession_amount,
          total_fine_amount: response.data.data.total_fine_amount,
          total_amount: parseInt(response.data.data.total_amount),
          total_pending_amount: response.data.data.total_pending_amount,
          amount: response.data.data.amount,
          total_paid_amount: totalPaidAmount,
          total_adjusted_amount: response.data.data.total_adjusted_amount,
          automatic_concession_details:
            response.data.data.automatic_concession_details,
        };
        if (response.data.data.total_pending_amount <= 0) {
          this.setState({
            openQuickPayModal: false,
          });
        }
        this.setState({
          feePlan,
          originalFeePlan: feePlan,
          selectedGroup,
          fee_group_plan,
          groupList,
          studentData,
          loading: false,
          feeSummary,
          isPaidFullFee: localIsPaidFullFee,
          selectedAcademicYear: response.data.data?.academic_year_data,
          studentUserId: studentUserId,
        });
      }
    });
  });
  };

  updateToParent = (feePlanData) => {
    let { isPaidFullFee, selectedGroup, is_fee_group_enabled } = this.state;
    let totalAmountPaid = 0;
    feePlanData.map((data) => {
      if (
        !is_fee_group_enabled ||
        (is_fee_group_enabled && data.fee_group === selectedGroup["fee_group"])
      ) {
        data.standard_fee.map((stdData) => {
          if (stdData.is_checked) {
            totalAmountPaid += parseFloat(stdData.amount_paid);
          }
          if (
            stdData.adjustment_deletable_ids &&
            stdData.adjustment_deletable_ids.length > 0
          ) {
            isPaidFullFee = false;
          }
        });
      }
    });
    this.setState({
      updatedPostData: [...feePlanData],
      updateSelectedData: [...feePlanData],
      totalAdditionalPay: 0,
      totalAmountPaid,
      isPaidFullFee,
      updateFeePlan: false,
    });
  };

  updateToStoreParent = (feePlanData) => {
    this.setState({
      updatedStorePostData: feePlanData,
    });
  };

  updateConcessionToParent = (value, totalConcession) => {
    this.setState(
      {
        updatingConcession: true,
        totalConcession: totalConcession ? totalConcession : 0,
      },
      () => {
        let fields = [...this.state.originalInvoiceFields];
        if (value) {
          fields = [
            ...this.state.originalInvoiceFields,
            ...this.state.concessIonInvoiceFields,
          ];
        }
        this.setState({
          enabledConcession: value,
          invoiceFields: [...fields],
          updatingConcession: false,
        });
      }
    );
  };

  closeFeePaymentModal = () => {
    this.setState({ openPaymentModal: false });
  };

  collectFees = async (data) => {
    let { adjustmentEnabled, openStudentAdjustmentPopup, studentData } = this.state;
    if (adjustmentEnabled || openStudentAdjustmentPopup) {
      let response = this.validateAdjustment(data);
      this.setState({ disableSubmit: true }, () => {
        if (!response["Result"]) {
          this.setState({ disableSubmit: false });
          return;
        } else {
          if (response["data"].length > 0) {
            this.setState({
              openAdjustmentModal: true,
              adjustmentData: response["data"],
              adjustmentDeleteData: response["deletable_ids"],
              body: [],
            });
          } else {
            this.setState(
              {
                adjustmentDeleteData: response["deletable_ids"],
                body: [],
              },
              () => {
                this.saveAdjustment();
              }
            );
          }
        }
      });
    } else {
      let response = this.validatePayingFees();
      this.setState({ disableSubmit: true });
      if (!response["Result"]) {
        this.setState({ disableSubmit: false });
        return;
      } else {
        const amountDetails = {
          student: getFullName(
            studentData.first_name,
            studentData.middle_name,
            studentData.last_name
          ),
          amount: response["totalAmount"],
        };
        this.setState({
          total_discount: response["total_discount"],
          openPaymentModal: true,
          amountDetails,
          totalAmount: response["totalAmount"],
          disableSubmit: false,
        });
      }
    }
  };

  getItemIssuedList = (feeIndex, termIndex) => {
    let returnValue = [];
    const { updatedStorePostData } = this.state;
    if (
      updatedStorePostData[feeIndex]["standard_fee"][termIndex]?.["store_list"]
    ) {
      updatedStorePostData[feeIndex]["standard_fee"][termIndex][
        "store_list"
      ].map((data) => {
        if (data.is_checked) {
          returnValue.push({
            student_store_mapping_id: data.student_store_mapping_id,
            is_issued: true,
            quantity: data.quantity,
          });
        }
      });
    }
    return returnValue;
  };

  payFees = (fieldValues, mode_of_payment_list) => {
    const { isFromProfile } = getUrlParam();
    const refNumber = fieldValues.refNo;
    const { paymentValue } = fieldValues;
    const {
      updatedPostData,
      studentid,
      yearid,
      enabledConcession,
      feeSummary,
      discountList,
      selectedGroup,
      studentData,
      total_discount,
      is_fee_group_enabled,
      additionalList,
      receiptDetails,
      is_mode_of_pay_multiple,
    } = this.state;

    let payment_ref_num = "";
    let error = false;

    // === 1️⃣ Validation for ref numbers ===
    if (paymentValue === "Online" && refNumber === "") {
      this.setState({
        alertData: `Please Fill RefNumber`,
        snackbar: true,
        severity: "error",
      });
      error = true;
    } else if (paymentValue === "Cheque" && refNumber === "") {
      this.setState({
        alertData: `Please enter Cheque Number`,
        snackbar: true,
        severity: "error",
      });
      error = true;
    }
    payment_ref_num = refNumber;

    if (error) return;
    let payload = {
      academic_year: yearid,
      student: studentid,
      mode_of_payment: "",
      payment_ref_num: "",
      payment_note: fieldValues.paymentNote,
      standard_fee: [],
      mode_of_payment_list: [],
    };

    if (is_mode_of_pay_multiple) {
      let mode_of_payment_list_data = [];

      mode_of_payment_list.forEach((data) => {
        let item = {
          mode_of_payment: data.paymentValue?.name || "",
          payment_ref_num: data.payment_ref_num || "",
          note: data.note || "",
          amount: parseFloat(data.amount || 0),
          bank_detail_id: data?.bank_details?.bank_detail_id || null
        };

        //Inject loan details if mode = Loan
        if (data.paymentValue?.name === "Loan") {
          item.loan_from_bank = data.from_bank || "";
          item.loan_to_bank = data.to_bank || "";
          item.loan_utr_number = data.utr_no || "";
          item.loan_credited_date = data.transfer_date || "";
        }

        mode_of_payment_list_data.push(item);
      });

      payload["mode_of_payment_list"] = mode_of_payment_list_data;
    } else {
      payload["mode_of_payment"] = paymentValue;
      payload["payment_ref_num"] = payment_ref_num;
      payload["payment_note"] = fieldValues.paymentNote;

      //  Inject loan fields for single-mode Loan
      if (paymentValue === "Loan") {
        payload["loan_from_bank"] = fieldValues.loan_from_bank || "";
        payload["loan_to_bank"] = fieldValues.loan_to_bank || "";
        payload["loan_utr_number"] = fieldValues.loan_utr_number || "";
        payload["loan_credited_date"] = fieldValues.loan_credited_date || "";
      }
    }

    // === 4️ Receipt Info ===
    if (receiptDetails["is_enabled"]) {
      payload["receipt_num"] = receiptDetails["receipt_num"];
      payload["transaction_date"] = dateFormat(
        receiptDetails["receipt_date"],
        "YYYY-MM-DD"
      );
    } else if (isUserHasPermission("manual_receipt_date", "create") && receiptDetails["receipt_date"]) {
      // Send receipt_date as transaction_date even when manual receipt is disabled
      // but user has manual_receipt_date permission
      payload["transaction_date"] = dateFormat(
        receiptDetails["receipt_date"],
        "YYYY-MM-DD"
      );
    }

    // === 5️ Fee Details ===
    let temp_fee_plan = {};
    updatedPostData.forEach((feeData, feeIndex) => {
      if (
        !is_fee_group_enabled ||
        (is_fee_group_enabled && feeData.fee_group === selectedGroup["fee_group"])
      ) {
        feeData["standard_fee"].forEach((termData, termIndex) => {
          if (termData["is_checked"] && termData["amount_paid"] != 0) {
            temp_fee_plan = {
              fee_plan: termData["id"],
              amount_paid:
                enabledConcession && termData?.["concessionAmount"]
                  ? parseFloat(
                    termData["amount_paid"] - termData?.["concessionAmount"]
                  )
                  : parseFloat(termData["amount_paid"]),
              pending_amount:
                termData["pending_amount"] - termData["amount_paid"],
              apply_automatic_concession_amount:
                enabledConcession && termData?.["concessionAmount"]
                  ? termData?.["concessionAmount"]
                  : null,
              fee_standard_mapping_item_selling_price_fee_standard_mapping:
                this.getItemIssuedList(feeIndex, termIndex),
            };
            if (additionalList.hasOwnProperty(termData["id"])) {
              temp_fee_plan["additional_charge_data"] =
                additionalList[termData["id"]];
            }
            payload.standard_fee.push(temp_fee_plan);
          }
        });
      }
    });

    // === 6️⃣ Adjustments ===
    let fee_group_adjustment = [];
    discountList.forEach((data) => {
      fee_group_adjustment.push({
        reason_id: data.reason_id.id,
        amount: parseFloat(data["amount"]),
        fee_group: selectedGroup.fee_group,
      });
    });
    payload["fee_group_adjustment"] = fee_group_adjustment;

    // === 7️⃣ Concession Handling ===
    if (enabledConcession) {
      payload["automatic_concession_apply"] = {
        concession_type: feeSummary?.automatic_concession_details?.id,
      };
    }

    // === 8️⃣ Validation: total match ===
    let tempTotal = 0;
    payload.standard_fee.forEach((data) => {
      tempTotal += parseFloat(data["amount_paid"]);
    });
    if (parseFloat(total_discount) > 0) {
      tempTotal = parseFloat(tempTotal) - parseFloat(total_discount);
    }
    if (tempTotal != this.state.totalAmount) {
      this.setState({
        alertData: `Payment Failed please refresh`,
        snackbar: true,
        severity: "error",
      });
      return;
    }

    // === 9️⃣ Submit ===
    this.setState({ disableSubmit: true }, () => {
      let url = POST_URL.feecollection.api;
      postRequest(url, payload, this.props).then(async (response) => {
        if (response && response.status === 200) {
          let response_temp = cloneDeep(response);
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response_temp.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });

          let props = { ...this.props };
          if (response_temp?.data?.data?.id) {
            props.title = `Fees collected for ${getFullName(
              studentData.first_name,
              studentData.middle_name,
              studentData.last_name
            )}`;
            props.url =
              GET_URL.feecollection.api + response_temp.data.data.id + "/";
            printPDF(props);
          }

          if (fieldValues.isSelectSamePage) {
            this.setState(
              {
                originalFeePlan: [],
                groupList: [],
                fee_group_plan: {},
                discount_ids: [],
                studentData: {},
                disableSubmit: false,
                updatedPostData: [],
                updatedStorePostData: [],
                updateSelectedData: [],
                adjustmentDeleteData: [],
                loading: true,
                isSelectSamePage: fieldValues.isSelectSamePage,
              },
              () => {
                this.getFeePlan();
              }
            );
          } else {
            if (isFromProfile) {
              let currentSelectedList = {
                studentId: studentid,
              };
              let searchParam =
                "?" + new URLSearchParams(currentSelectedList).toString();
              let url = Actions.fee_collection_student.view.url;
              this.props.history.push({
                pathname: url,
                search: searchParam,
                state: { detail: studentid },
              });
            } else {
              this.props.history.push(Actions.fee_collection.view.url);
            }
          }
        }
        this.setState({ disableSubmit: false });
        this.closeFeePaymentModal();
      });
    });
  };

  handleClose = () => {
    this.setState({
      snackbar: false,
    });
  };

  enableDisableAdjustment = () => {
    let { adjustmentEnabled } = this.state;
    this.setState({
      adjustmentEnabled: !adjustmentEnabled,
    });
  };

  closeAdjustmentModal = () => {
    this.setState({
      openAdjustmentModal: false,
    });
  };

  saveAdjustment = (adjustmentModalData = {}) => {
    this.setState({ adjustmentSaveBlocked: true }, () => {
      const {
        studentid,
        yearid,
        standardid,
        adjustmentDeleteData,
        is_adjustment_request,
        is_adjustment_approval,
      } = this.state;
      let { adjustmentData } = this.state;
      let postData = {
        student: parseInt(studentid),
        academic_year: parseInt(yearid),
        standard: parseInt(standardid),
        adjustment: [],
      };
      let tempData = [];
      if (adjustmentData.length > 0) {
        adjustmentData.map((data) => {
          tempData.push({
            is_addition: data["is_addition"],
            fee_plan: data["fee_plan"],
            amount: data["adjust_amount"],
            reason_id: adjustmentModalData && adjustmentModalData["reason_id"] ? adjustmentModalData["reason_id"] : null,
          });
        });
        postData["adjustment"] = tempData;
      }
      if (adjustmentDeleteData.length > 0) {
        postData["delete_data_to_ids"] = adjustmentDeleteData;
      }
      // Add approved document IDs if provided
      if (adjustmentModalData && adjustmentModalData["approved_document_ids"] && adjustmentModalData["approved_document_ids"].length > 0) {
        postData["approved_document_ids"] = adjustmentModalData["approved_document_ids"];
      }
      let url = POST_URL.adjustment.api;
      if (is_adjustment_request && !is_adjustment_approval) {
        url = POST_URL.adjustmentapprovalrequest.api;
      }
      postRequest(url, postData, this.props).then((response) => {
        const savedFromStudentFeesPopup = this.state.openStudentAdjustmentPopup;
        this.setState({ adjustmentSaveBlocked: false });
        this.closeAdjustmentModal();
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          if (savedFromStudentFeesPopup) {
            this.setState({ openStudentAdjustmentPopup: false }, () => {
              this.getFeePlan();
            });
          } else {
            this.props.history.push(Actions.fee_adjustment.view.url);
          }
        }
      });
    });
  };

  saveDiscount = (data) => {
    let { discountList } = this.state;
    discountList.push(data);
    this.setState(
      {
        discountList,
        openDisountPage: false,
      },
      () => {
        let total_discount = 0;
        if (discountList.length > 0) {
          discountList.map((data) => {
            total_discount += parseFloat(data["amount"]);
          });
        }
        this.setState({
          total_discount,
        });
      }
    );
  };

  handleDeleteDiscount = (index) => {
    let { discountList } = this.state;
    discountList.splice(index, 1);
    this.setState(
      {
        discountList,
      },
      () => {
        let total_discount = 0;
        if (discountList.length > 0) {
          discountList.map((data) => {
            total_discount += parseFloat(data["amount"]);
          });
        }
        this.setState({
          total_discount,
        });
      }
    );
  };

  handleQucikPayModal = (value) => {
    this.setState({
      openQuickPayModal: value,
    });
  };

  showEnableFeaturePopup = () => {
    this.setState({
      showEnableFeaturePopup: true,
    });
  };

  closeFeaturePopup = () => {
    this.setState(
      {
        showEnableFeaturePopup: false,
        originalFeePlan: [],
        groupList: [],
        fee_group_plan: {},
        discount_ids: [],
        studentData: {},
        disableSubmit: false,
        updatedPostData: [],
        updatedStorePostData: [],
        updateSelectedData: [],
        adjustmentDeleteData: [],
        loading: true,
      },
      () => {
        this.getFeePlan();
      }
    );
  };

  handleDropDownWithSearchChange = (newValue) => {
    this.setState({
      selectedGroup: newValue,
      feePlan: [...this.state.originalFeePlan],
      updateSelectedData: [],
      totalAmountPaid: 0,
      total_discount: 0,
      discountList: [],
    });
  };

  handleDisountPage = () => {
    const { totalAmountPaid, discountList } = this.state;
    if (totalAmountPaid > 0) {
      let discount_ids = [];
      discountList.map((data) => {
        discount_ids.push(data["reason_id"]["id"]);
      });
      this.setState({
        openDisountPage: true,
        discount_ids,
      });
    } else {
      this.setState({
        snackbar: true,
        alertData: "Select Amount To Add Discount",
      });
    }
  };

  closeDiscountModal = () => {
    this.setState({
      openDisountPage: false,
    });
  };

  openStudentAdjustmentPopup = () => {
    this.setState({ openStudentAdjustmentPopup: true });
  };

  closeStudentAdjustmentPopup = () => {
    this.setState({ openStudentAdjustmentPopup: false });
    // Refresh current fee plan after closing popup so latest adjustment reflects here.
    this.getFeePlan();
  };

  updateParentGroupPlan = (fee_group_plan) => {
    const { selectedGroup, groupList, initialSelect } = this.state;
    this.setState(
      {
        fee_group_plan,
        is_enabled_submit:
          fee_group_plan[selectedGroup?.["fee_group"]]?.["group_pending"] > 0
            ? true
            : false,
      },
      () => {
        if (initialSelect) {
          this.getPendingFeeGroup();
        }
      }
    );
  };

  getPendingFeeGroup = () => {
    const { fee_group_plan, groupList, adjustmentEnabled } = this.state;
    let pendingGroupList = [];
    let selectedGroup = "";
    for (const data in fee_group_plan) {
      if (fee_group_plan[data]["group_pending"] > 0 && !adjustmentEnabled) {
        pendingGroupList.push(fee_group_plan[data]["fee_group"]);
      }
    }
    for (const data of groupList) {
      if (pendingGroupList.length === 0) {
        selectedGroup = data;
        break;
      }
      if (pendingGroupList.includes(data["fee_group"])) {
        selectedGroup = data;
        break;
      }
    }
    this.setState(
      {
        selectedGroup,
        initialSelect: false,
      },
      () => {
        this.updateToParentFeePlan(
          fee_group_plan[selectedGroup["fee_group"]]["group_pending"]
        );
      }
    );
  };

  updateToParentFeePlan = (value) => {
    this.setState(
      {
        updateFeePlan: false,
      },
      () => {
        const {
          feePlan,
          selectedGroup,
          is_term_wise_view,
          termFeePlanNew,
          is_fee_group_enabled,
        } = this.state;
        let tempPlan = cloneDeep(feePlan);
        let temp_amount = parseFloat(value);
        if (is_term_wise_view) {
          termFeePlanNew.map((terms, tIndex) => {
            tempPlan.map((feeData) => {
              feeData.standard_fee.map((feetermData) => {
                if (terms.name === feetermData.terms) {
                  if (temp_amount > 0 && feetermData["pending_amount"] > 0) {
                    feetermData["is_checked"] = true;
                    if (
                      temp_amount < parseFloat(feetermData["pending_amount"])
                    ) {
                      feetermData["amount_paid"] = parseFloat(temp_amount);
                      temp_amount =
                        parseFloat(temp_amount) -
                        parseFloat(feetermData["pending_amount"]);
                    } else {
                      temp_amount =
                        parseFloat(temp_amount) -
                        parseFloat(feetermData["pending_amount"]);
                      feetermData["amount_paid"] = parseFloat(
                        feetermData["pending_amount"]
                      );
                    }
                  } else {
                    feetermData["is_checked"] = false;
                    feetermData["amount_paid"] = parseFloat(0);
                  }
                }
              });
            });
          });
        } else {
          tempPlan.map((feeData) => {
            if (
              (!is_term_wise_view && !is_fee_group_enabled) ||
              feeData.fee_group === selectedGroup["fee_group"]
            ) {
              feeData.standard_fee.map((feetermData) => {
                if (temp_amount > 0 && feetermData["pending_amount"] > 0) {
                  feetermData["is_checked"] = true;
                  if (temp_amount < parseFloat(feetermData["pending_amount"])) {
                    feetermData["amount_paid"] = parseFloat(temp_amount);
                    temp_amount =
                      parseFloat(temp_amount) -
                      parseFloat(feetermData["pending_amount"]);
                  } else {
                    temp_amount =
                      parseFloat(temp_amount) -
                      parseFloat(feetermData["pending_amount"]);
                    feetermData["amount_paid"] = parseFloat(
                      feetermData["pending_amount"]
                    );
                  }
                } else {
                  feetermData["is_checked"] = false;
                  feetermData["amount_paid"] = parseFloat(0);
                }
              });
            }
          });
        }
        this.setState(
          {
            feePlan: cloneDeep(tempPlan),
            updateFeePlan: true,
          },
          () => {
            this.updateToParent(tempPlan);
          }
        );
      }
    );
  };

  updateAdditionalCharges = (
    additionalList,
    totalAdditionalPay,
    additionalModeOfPay
  ) => {
    this.setState({
      additionalList: { ...additionalList },
      totalAdditionalPay,
      additionalModeOfPay,
    });
  };

  showPaidHistory = () => {
    this.setState({
      showFeePaidHistory: true,
    });
  };

  closeInParent = () => {
    this.setState({
      showFeePaidHistory: false,
    });
  };

  updateTermFeePlanNew = (term_plan) => {
    this.setState({
      termFeePlanNew: term_plan,
    });
  };

  updateReceiptToParent = (updateReceiptDetails) => {
    this.setState({
      receiptDetails: { ...updateReceiptDetails },
    });
  };

  updateStudentArea = () => {
    const { selected_area_id, yearid, studentUserId } = this.state;

    if (!selected_area_id) {
      this.setState({
        snackbar: true,
        alertData: "Please select an area",
      });
      return;
    }

    if (!studentUserId) {
      this.setState({
        snackbar: true,
        alertData: "Student user not found",
      });
      return;
    }

    const payload = {
      user: parseInt(studentUserId),   // ✅ FIXED
      academic_year: parseInt(yearid),
      area: parseInt(selected_area_id),
      area_datas: {}
    };
    console.log('--------------------------------->', payload)
    const url = POST_URL.routeuseraddress.api;

    postRequest(url, payload, this.props).then((response) => {
      if (response) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason || "Area updated successfully",
          showConfirmButton: false,
          timer: 1500,
        });

        this.getFeePlan();
      }
    });
  };



  getSelectedItem() {
    let { areaList, selected_area_id } = this.state
    const item = areaList.find((opt) => {
      if (parseInt(opt.id) === selected_area_id)
        return opt;
    })
    return item || {};
  }

  onChangeArea = (value) => {
    if (value) {
      this.setState({
        selected_area_id: value.id,
        selected_area: value,
      });
    } else {
      this.setState({
        selected_area_id: "",
        selected_area: null,
      });
    }
  };



  pushToFeesCollection = (yearId, standardId, id) => {
    let searchState = {
      yearid: yearId,
      standardid: standardId,
      studentid: id,
      isFromProfile: true,
    };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    let url = Actions.fee_collection.create.url;
    this.props.history.push({
      pathname: url,
      search: searchParam,
    })
    window.location.reload();
  };

  render() {
    const {
      feePlan,
      studentData,
      disableSubmit,
      snackbar,
      fee_group_plan,
      groupList,
      selectedGroup,
      discount_ids,
      isPaidFullFee,
      alertData,
      loading,
      feeSummary,
      updatingConcession,
      enabledConcession,
      total_discount,
      adjustmentEnabled,
      showEnableFeaturePopup,
      studentid,
      yearid,
      standardid,
      discountList,
      totalAmountPaid,
      is_quick_fee_modal,
      is_fee_group_enabled,
      is_enabled_submit,
      adjustmentPermission,
      isSelectSamePage,
      is_adjustment_request,
      is_adjustment_approval,
      totalAdditionalPay,
      additionalModeOfPay,
      showFeePaidHistory,
      updateSelectedData,
      totalConcession,
      updateFeePlan,
      is_mode_of_pay_multiple,
      alias_names,
      studentPendingFeeList,
      siblingPendingFeeList,
      areaList,
      isTransportPlan,
      openStudentAdjustmentPopup,
    } = this.state;
    const showFeeAdjustmentSubmit =
      adjustmentEnabled ||
      (this.state.enabledActions.includes("create") &&
        !isPaidFullFee &&
        is_enabled_submit);
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper
          className="paper-background student-fees-page"
          key={this.state.refreshKey}
        >
          <Grid
            container
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            className="student-fees-page__header"
          >
            <Grid item xs={12} md={6}>
              <Box className="heading student-fees-page__header-title">
                {!adjustmentEnabled ? (
                  <FormattedMessage {...messages.viewFeeCollectionHeading} />
                ) : (
                  <FormattedMessage {...messages.viewFeeAdjustmentHeading} />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="student-fees-page__header-actions">
                <Button
                  variant="contained"
                  component={Link}
                  to={
                    adjustmentEnabled
                      ? Actions.fee_adjustment.view.url
                      : Actions.fee_collection.view.url
                  }
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" /> View
                  Student List
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box className="student-fees-toolbar">
            {feeSummary.total_pending_amount > 0 &&
              is_quick_fee_modal &&
              !adjustmentEnabled && (
                <Box className="student-fees-toolbar__item">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => this.handleQucikPayModal(true)}
                  >
                    Quick Pay
                  </Button>
                </Box>
              )}
            {isUserHasPermission("feature_enable", "view") && (
              <Box className="student-fees-toolbar__item">
                <Tooltip
                  title="Assign Non Mandatory Fees"
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Button
                    className="collect-fees"
                    size="small"
                    onClick={this.showEnableFeaturePopup}
                  >
                    Assign Non Mandatory Fee
                  </Button>
                </Tooltip>
              </Box>
            )}
            {isUserHasPermission("fee_history_student", "view") && (
              <Box className="student-fees-toolbar__item">
                <Tooltip
                  title={"Assign Non Mandatory Fees"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Button
                    className={"collect-fees"}
                    size="small"
                    onClick={() => {
                      this.showPaidHistory();
                    }}
                  >
                    Fee Paid History
                  </Button>
                </Tooltip>
              </Box>
            )}
            {!adjustmentEnabled && adjustmentPermission && (
              <Box className="student-fees-toolbar__item">
                <Tooltip
                  title={"Give adjustment for this student"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Button
                    className={"collect-fees"}
                    size="small"
                    onClick={this.openStudentAdjustmentPopup}
                  >
                    Adjustment
                  </Button>
                </Tooltip>
              </Box>
            )}
            {is_fee_group_enabled && (
              <Box className="student-fees-toolbar__item student-fees-toolbar__item--grow">
                <DropDownWithSearch
                  id="combo-box-demo"
                  options={groupList}
                  optionValue="fee_group_name"
                  value={selectedGroup}
                  onChange={(e, newValue) =>
                    this.handleDropDownWithSearchChange(newValue)
                  }
                  label={"Fee Group"}
                  autoCompleteClassName="width-300px"
                  className="width-inherit bg-white"
                  size="small"
                  hideClearIcon
                />
              </Box>
            )}
            {isTransportPlan && (
              <Box
                display="flex"
                flexWrap="wrap"
                alignItems="center"
                className="student-fees-toolbar__item student-fees-toolbar__transport"
                style={{ gap: 12 }}
              >
                <Autocomplete
                  id="select-area"
                  style={{ minWidth: 200, flex: "1 1 200px" }}
                  options={areaList}
                  value={this.getSelectedItem()}
                  getOptionLabel={(option) => option?.name || ""}
                  onChange={(e, value) => this.onChangeArea(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Area"
                      variant="outlined"
                      size="small"
                    />
                  )}
                />
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={this.updateStudentArea}
                >
                  Update Area
                </Button>
              </Box>
            )}
          </Box>
          <Grid container className="place-content-center-900-mx student-fees-content">
            <Grid item lg={12} md={12} xl={8} sm={10}>
              {studentData && (
                <FeeCollectionStudentProfile
                  studentData={studentData}
                  feeSummary={feeSummary}
                  handledQuickPay={this.handleQucikPayModal}
                />
              )}
            </Grid>
          </Grid>
          <Grid container className="place-content-center-900-mx">
            <Grid item lg={12} md={12} xl={8} sm={10}>
              <Grid
                item
                lg={11}
                sm={12}
                style={{ marginLeft: "auto", marginRight: "auto" }}
              >
                {siblingPendingFeeList.length > 0 && (
                  <div id="sibling-fee-section">
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                      color: '#333',
                      borderBottom: '2px solid red',
                      display: 'inline-block',
                      paddingBottom: '5px'
                    }}>
                      Sibling Fee Pending Details
                    </h2>

                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      fontFamily: 'Arial, sans-serif',
                      marginBottom: '20px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Student Name</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Academic Year</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Standard</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Pending Amount</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* ✅ Current Student First Row */}
                        <tr style={{ backgroundColor: '#fff9c4' }}>
                          <td style={{ padding: '10px' }}>
                            {getFullName(
                              studentData?.first_name,
                              studentData?.middle_name,
                              studentData?.last_name
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{studentData?.year_name ?? 'N/A'}</td>
                          <td style={{ padding: '10px' }}>{studentData?.standard ?? 'N/A'}</td>
                          <td style={{ padding: '10px' }}>₹{feeSummary?.total_pending_amount ?? 0}</td>
                          <td style={{ padding: '10px' }}>
                            -
                          </td>
                        </tr>

                        {/* 🧑‍🤝‍🧑 Sibling Rows */}
                        {siblingPendingFeeList.map((studentData, sIndex) =>
                          studentData.fee_data.map((feeData, fIndex) => (
                            <tr key={`${sIndex}-${fIndex}`} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '10px' }}>
                                {getFullName(
                                  studentData['student__first_name'],
                                  studentData['student__middle_name'],
                                  studentData['student__last_name']
                                )}
                              </td>
                              <td style={{ padding: '10px' }}>{feeData['year_name']}</td>
                              <td style={{ padding: '10px' }}>{studentData['standard_name']}</td>
                              <td style={{ padding: '10px' }}>₹{feeData['pending_amount']}</td>
                              <td style={{ padding: '10px' }}>
                                <Button
                                  style={{
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    this.pushToFeesCollection(
                                      feeData['academic_year'],
                                      feeData['standard'],
                                      studentData['student_id']
                                    );
                                  }}
                                >
                                  Collect Fees
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}

                        {/* 📊 Total Rows */}
                        <tr style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }}>
                          <td colSpan={3} style={{ padding: '12px', textAlign: 'right' }}>
                            Grand Total Pending
                          </td>
                          <td style={{ padding: '12px' }}>
                            ₹{
                              (
                                (siblingPendingFeeList.reduce((total, studentData) =>
                                  total + studentData.fee_data.reduce((sum, fee) => sum + fee.pending_amount, 0), 0)
                                ) + (feeSummary?.total_pending_amount ?? 0)
                              )
                            }
                          </td>
                          <td>
                            <div >
                              <Button
                                variant="outlined"
                                height="10px"
                                style={{
                                  backgroundColor: "#ebebeb",
                                  color: 'black',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: "12px"
                                }}
                                onClick={() => {
                                  const printContents = document.getElementById('sibling-fee-section').innerHTML;
                                  const win = window.open('', '', 'width=900,height=700');
                                  win.document.write('<html><head><title>Sibling Fee Pending Details</title>');
                                  win.document.write(`
                                    <style>
                                      body { font-family: Arial; padding: 20px; }
                                      h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
                                      h2 { text-align: center; font-size: 18px; margin-top: 0; }
                                    </style>
                                  `);
                                  win.document.write('</head><body>');
                                  win.document.write(`<h1>${this.state.user?.institute_details?.name}</h1>`);
                                  win.document.write(printContents);
                                  win.document.write('</body></html>');
                                  win.document.close();
                                  win.print();
                                }}
                              >
                                Print Sibling Fee Pending
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {studentPendingFeeList.length > 0 &&
                  <>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                      color: '#333',
                      borderBottom: '2px solid red',
                      display: 'inline-block',
                      paddingBottom: '5px'
                    }}>
                      Student Previous Years Pending Fee Details
                    </h2>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      fontFamily: 'Arial, sans-serif',
                      marginBottom: '20px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Academic Year</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Pending Amount</th>
                          <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPendingFeeList.map((feeData, findex) => (
                          <tr key={findex} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>{feeData['year_name']}</td>
                            <td style={{ padding: '10px' }}>{feeData['pending_amount']}</td>
                            <td style={{ padding: '10px' }}>
                              <Button style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                                onClick={() => {
                                  this.pushToFeesCollection(feeData['academic_year'], feeData['standard'], studentid);
                                }}
                              >
                                Collect Fees
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                      color: '#333',
                      borderBottom: '2px solid #4CAF50',
                      display: 'inline-block',
                      paddingBottom: '5px'
                    }}>
                      {studentData.year_name}
                    </h2>
                  </>
                }
                {feePlan.length > 0 &&
                  (!openStudentAdjustmentPopup || adjustmentEnabled) && (
                  <FeeCollectionDetailedView
                    updateParentGroupPlan={this.updateParentGroupPlan}
                    selectedGroup={selectedGroup}
                    fee_group_plan={fee_group_plan}
                    feePlan={feePlan}
                    adjustmentEnabled={adjustmentEnabled}
                    feeDetailedSummary={feeSummary}
                    updateToParent={this.updateToParent}
                    enabledActions={this.state.enabledActions}
                    updateConcessionToParent={this.updateConcessionToParent}
                    saveButtonBlocked={disableSubmit}
                    updateFeePlan={updateFeePlan}
                    updateTermFeePlanNew={this.updateTermFeePlanNew}
                    updateToParentFeePlan={this.updateToParentFeePlan}
                  />
                )}
              </Grid>
            </Grid>
            {is_enabled_submit &&
              feeSummary.total_pending_amount > 0 &&
              adjustmentPermission &&
              !adjustmentEnabled && (
                <Grid
                  item
                  lg={11}
                  sm={12}
                  xl={12}
                  style={{ marginLeft: "auto", marginRight: "auto" }}
                >
                  <Grid item lg={2} sm={12} style={{ marginLeft: "auto" }}>
                    <Button
                      variant="contained"
                      p={1}
                      className="addDetails"
                      onClick={this.handleDisountPage}
                    >
                      <AddCircleOutlineOutlinedIcon
                        style={{ marginRight: "10px", fontSize: "25px" }}
                      />{" "}
                      {`Add ${alias_names["discount"]}`}
                    </Button>
                  </Grid>
                </Grid>
              )}
            {!adjustmentEnabled && feeSummary.total_pending_amount > 0 && (
              <Grid
                item
                lg={11}
                sm={12}
                xl={12}
                style={{ marginLeft: "auto", marginRight: "auto" }}
              >
                <Grid item lg={5} sm={12} style={{ marginLeft: "auto" }}>
                  <FeeCollectionDiscountList
                    discountList={discountList}
                    feePlan={feePlan}
                    totalAmountPaid={totalAmountPaid}
                    handleDeleteDiscount={this.handleDeleteDiscount}
                    selectedGroup={selectedGroup}
                    fee_group_plan={fee_group_plan}
                    updateToParentFeePlan={this.updateToParentFeePlan}
                    is_enabled_submit={is_enabled_submit}
                    feeSummary={feeSummary}
                    is_fee_group_enabled={is_fee_group_enabled}
                    totalAdditionalPay={totalAdditionalPay}
                    totalConcession={totalConcession}
                    updateReceiptToParent={this.updateReceiptToParent}
                  />
                </Grid>
              </Grid>
            )}
            <Grid item lg={12} sm={12} xl={8}>
              <Grid
                item
                lg={11}
                sm={12}
                style={{ marginLeft: "auto", marginRight: "auto" }}
              >
                {!updatingConcession && !is_fee_group_enabled && (
                  // !is_term_wise_view &&
                  <FeeCollectionInvoiceView
                    invoiceData={adjustmentEnabled ? [] : updateSelectedData}
                    invoiceFields={this.state.invoiceFields}
                    enabledConcession={enabledConcession}
                    updateAdditionalCharges={this.updateAdditionalCharges}
                    totalAmountPaid={totalAmountPaid}
                  />
                )}
              </Grid>
            </Grid>
            <Grid item lg={12} sm={12} xl={8}>
              <Grid
                item
                lg={11}
                sm={12}
                style={{ marginLeft: "auto", marginRight: "auto" }}
              >
                <FeeCollectionStoreIssue
                  updateSelectedData={updateSelectedData}
                  feePlan={feePlan}
                  updateToStoreParent={this.updateToStoreParent}
                />
              </Grid>
            </Grid>
          </Grid>
          {!openStudentAdjustmentPopup && showFeeAdjustmentSubmit && (
              <Grid container>
                <Grid item lg={12} md={12} xl={8} sm={10}>
                  <Box className="button-group" mt={3}>
                    <Button
                      className={`submit`}
                      variant="contained"
                      disabled={disableSubmit}
                      style={{ float: "right" }}
                      onClick={(e) => this.collectFees()}
                    >
                      {is_adjustment_request && !is_adjustment_approval && (
                        <div>Request</div>
                      )}
                      {((is_adjustment_approval && is_adjustment_request) ||
                        !is_adjustment_request) && (
                          <FormattedMessage {...commonMessages.submit} />
                        )}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          {
            this.state.openPaymentModal && (
              // (is_mode_of_pay_multiple ? (
              <PaymentModalNew
                amountDetails={this.state.amountDetails}
                closeFeePaymentModal={() => this.closeFeePaymentModal()}
                payFees={this.payFees}
                isSamePageShow={true}
                isSelectSamePage={isSelectSamePage}
                isTaxHide={true}
                payDisabled={disableSubmit}
                totalAdditionalPay={totalAdditionalPay}
                additionalModeOfPay={additionalModeOfPay}
              />
            )
            // ) : (
            //   <PaymentModal
            //     amountDetails={this.state.amountDetails}
            //     closeFeePaymentModal={() => this.closeFeePaymentModal()}
            //     payFees={this.payFees}
            //     isSamePageShow={true}
            //     isSelectSamePage={isSelectSamePage}
            //     isTaxHide={true}
            //     payDisabled={disableSubmit}
            //     totalAdditionalPay={totalAdditionalPay}
            //     additionalModeOfPay={additionalModeOfPay}
            //   />
            // ))
          }
          {this.state.openAdjustmentModal && (
            <AdjustmentModal
              body={this.state.adjustmentData}
              payAdjustment={this.payAdjustment}
              showModal={this.state.openAdjustmentModal}
              closeInParent={this.closeAdjustmentModal}
              saveAdjustment={this.saveAdjustment}
              saveButtonBlocked={this.state.adjustmentSaveBlocked}
            />
          )}
          {this.state.openDisountPage && (
            <FeeCollectionDiscount
              payAdjustment={this.payAdjustment}
              showModal={this.state.openDisountPage}
              closeInParent={this.closeDiscountModal}
              saveAdjustment={this.saveDiscount}
              saveButtonBlocked={this.state.adjustmentSaveBlocked}
              totalAmountPaid={totalAmountPaid}
              total_discount={total_discount}
              discount_ids={discount_ids}
            />
          )}
          {this.state.openQuickPayModal && (
            <QuickPayModal
              feePlan={feePlan}
              updateToParent={this.updateToParent}
              handleClose={() => this.handleQucikPayModal()}
              studentData={studentData}
              enabledActions={this.state.enabledActions}
              collectFees={() => this.collectFees()}
            />
          )}
          {showEnableFeaturePopup && (
            <EnableFeaturePopup
              studentIds={[parseInt(studentid)]}
              closeFeaturePopup={this.closeFeaturePopup}
              yearId={yearid}
              current_standard={standardid}
              studentTypes={["Day Scholar"]}
              isViewOnly={!isUserHasPermission("feature_enable", "create")}
            />
          )}
          {showFeePaidHistory && (
            <StudentFeePaidHistoryModal
              studentId={parseInt(studentid)}
              closeInParent={this.closeInParent}
              yearId={yearid}
              current_standard={standardid}
            />
          )}
          <Dialog
            open={Boolean(openStudentAdjustmentPopup)}
            onClose={this.closeStudentAdjustmentPopup}
            maxWidth="md"
            fullWidth
            scroll="paper"
          >
            <DialogTitle disableTypography>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box fontWeight={700}>Student Adjustment</Box>
                <IconButton onClick={this.closeStudentAdjustmentPopup} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers style={{ padding: 16, maxHeight: "75vh" }}>
              {feePlan.length > 0 && (
                <FeeCollectionDetailedView
                  updateParentGroupPlan={this.updateParentGroupPlan}
                  selectedGroup={selectedGroup}
                  fee_group_plan={fee_group_plan}
                  feePlan={feePlan}
                  adjustmentEnabled={true}
                  feeDetailedSummary={feeSummary}
                  updateToParent={this.updateToParent}
                  enabledActions={this.state.enabledActions}
                  updateConcessionToParent={this.updateConcessionToParent}
                  saveButtonBlocked={disableSubmit}
                  updateFeePlan={updateFeePlan}
                  updateTermFeePlanNew={this.updateTermFeePlanNew}
                  updateToParentFeePlan={this.updateToParentFeePlan}
                />
              )}
              {showFeeAdjustmentSubmit && (
                <Box className="button-group" mt={3} display="flex" justifyContent="flex-end">
                  <Button
                    className="submit"
                    variant="contained"
                    disabled={disableSubmit}
                    onClick={() => this.collectFees()}
                  >
                    {is_adjustment_request && !is_adjustment_approval && <span>Request</span>}
                    {((is_adjustment_approval && is_adjustment_request) ||
                      !is_adjustment_request) && (
                      <FormattedMessage {...commonMessages.submit} />
                    )}
                  </Button>
                </Box>
              )}
            </DialogContent>
          </Dialog>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={snackbar}
            autoHideDuration={10000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Paper>
      );
    }
  }
}

export default withRouter(FeeCollectionNew);
