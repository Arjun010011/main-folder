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

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.sectionName} />,
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
const note = `Note: For Example (${alias_names["section"]} A)`;

class ManageSection extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
    };
  }

  postMethod = (sections) => {
    this.setState({ submitDisable: true });
    let payload = { sections };
    let url = POST_URL.section.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.sections.view.url);
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
          header={Actions.sections.create.label}
          name={Actions.sections.view.label}
          viewUrl={Actions.sections.view.url}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          note={note}
          idFormat={"section_2022_08_11_2_pm_"}
        />
      </div>
    );
  }
}

export default withRouter(ManageSection);
