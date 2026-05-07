import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";

import MultipleAdd from "Components/MultipleAdd";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import { SUCCESS_MSG_PROPS } from "Constants";
import "./styles.scss";

const fieldDetails = [
  {
    label: "Concession Type",
    regex: nameAndNumberRegex,
    autoFocus: true,
    name: "name",
    md: 6,
    maxLength: "25",
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
  },
];
class AddConcessionTypeAdd extends Component {
  constructor(props) {
    super(props);
    this.state = {
      submitDisable: false,
    };
  }

  postMethod = (concessiontypes) => {
    this.setState({ submitDisable: true });
    let payload = { concession_type: concessiontypes };
    let url = POST_URL.concessiontypes.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          ...SUCCESS_MSG_PROPS,
          title: "Your Data has been saved",
        });
        this.props.history.push(Actions.concession_type.view.url);
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
          header="Add Concession Type"
          subheader="This module is responsible for creating the different types of Concessions as per the school’s requirement."
          name="Concession Type"
          viewUrl={Actions.concession_type.view.url}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
          buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
          bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
          note=' Eg: Merit, Scholar'
          idFormat={'concession_add_2022_08_11_2_pm_'}
        />
      </div>
    );
  }
}

export default withRouter(AddConcessionTypeAdd);
