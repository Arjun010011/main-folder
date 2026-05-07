import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";

import MultipleAdd from "Components/MultipleAdd";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

const fieldDetails = [
  {
    label:"Name",
    regex: nameAndNumberRegex,
    name: "name",
    md: 6,
    maxLength: "225",
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: false,
  },
];
const note = `Note: For Example ( Accountable )`;

class FeeCategory extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
    };
  }

  postMethod = (category) => {
    this.setState({ submitDisable: true });
    let payload = { category };
    let url = POST_URL.feecategory.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.fee_category.view.url);
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
          header={Actions.fee_category.create.label}
          name={Actions.fee_category.view.label}
          viewUrl={Actions.fee_category.view.url}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          note={note}
          idFormat={"section_2022_08_11_2_pm_"}
        />
      </div>
    );
  }
}

export default withRouter(FeeCategory);
