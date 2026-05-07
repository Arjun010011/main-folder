import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";

import MultipleAdd from "Components/MultipleAdd";
import { nameRegex, nameAndNumberRegex } from "Constants/regularExpression";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";

const fieldDetails = [
  {
    label: <FormattedMessage {...messages.vendorName} />,
    regex: nameRegex,
    autoFocus: false,
    name: "name",
    md: 6,
    maxLength: "50",
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
  },
  {
    label: "Mobile No.",
    regex: null,
    name: "mobile_num",
    md: 6,
    className: "width-form-90 mt-20",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "phone_number",
    maxLength: 15,
  },
  {
    label: <FormattedMessage {...messages.vendorAddress} />,
    regex: null,
    autoFocus: false,
    name: "address",
    md: 12,
    maxLength: "100",
    className: "width-80",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text_area",
  },
];

class AddLibVendors extends Component {
  constructor(props) {
    super(props);
    this.state = {
      submitDisable: false,
    };
  }

  postMethod = (vendor) => {
    this.setState({ submitDisable: true });
    let post_data = {
      vendors: vendor,
    };

    let url = POST_URL.libvendor.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.library_vendors.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };
  render() {
    const { submitDisable } = this.state;
    return (
      <div>
        <MultipleAdd
          fieldDetails={fieldDetails}
          header={Actions.library_vendors.create.label}
          name={Actions.library_vendors.view.label}
          viewUrl={Actions.library_vendors.view.url}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
          buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
          bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
          idFormat={"vendor_add_2022_08_11_3_pm_"}
        />
      </div>
    );
  }
}

export default withRouter(AddLibVendors);
