import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import { cloneDeep } from "lodash";

import MultipleAdd from "Components/MultipleAdd";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import "./styles.scss";
import LoadingGif from "Components/LoadingGif";

const fieldDetails_global = [
  {
    label: "Name",
    regex: nameWithQuoteRegex,
    autoFocus: false,
    name: "name",
    md: 6,
    maxLength: "100",
    className: "width-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
  },
  {
    label: "Fee Type",
    regex: null,
    name: "codename",
    md: 6,
    className: "width-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDownWithSearch",
    maxLength: 25,
    list: [],
    isDuplicateAllow: true
  },
];
const header = "Fee Type";
const subheader =
  "This module is responsible for creating the different types of fees as per the school’s requirement. Eg: Tution Fees, Online Fees ...";

class AddFeeTypeAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      loading: true,
      fieldDetails: null,
    };
  }

  componentDidMount = () => {
    this.getFinanceTypeList();
  };

  getFinanceTypeList = () => {
    const url = GET_URL.getfeecodenames.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let fieldDetails = cloneDeep(fieldDetails_global);
        let code_list = [];
        response.data.data.map((data) => {
          code_list.push({ id: data, name: data });
        });
        fieldDetails[1]["list"] = code_list;
        this.setState({
          fieldDetails,
          loading: false,
        });
      }
    });
  };

  postMethod = (tempList) => {
    this.setState({ submitDisable: true });
    let feetypes = [];
    tempList.map((data) => {
      if (data.codename) {
        data.codename = data.codename.name;
      }
      feetypes.push(data);
    });
    let payload = { feetypes };
    let url = POST_URL.addFeeType.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.fee_type.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };

  render() {
    const { submitDisable, loading, fieldDetails } = this.state;
    if (loading) {
      return <LoadingGif />;
    }
    return (
      <div>
        {fieldDetails && (
          <MultipleAdd
            fieldDetails={fieldDetails}
            header={header}
            subheader={subheader}
            name="Fee Type"
            viewUrl={Actions.fee_type.view.url}
            submitDisable={submitDisable}
            postMethod={this.postMethod}
            headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
            buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
            bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
            idFormat={"fee_type_add_2022_08_11_2_pm_"}
            requiredAllObject={true}
          />
        )}
      </div>
    );
  }
}

export default withRouter(AddFeeTypeAdd);
