import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";

import MultipleAdd from "Components/MultipleAdd";
import { nameWithQuoteAndWithoutZeroRegex } from "Constants/regularExpression";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import "./styles.scss";
import { Actions } from "Constants/permissions";

const fieldDetails = [
  {
    label: "Expenses Category",
    regex: nameWithQuoteAndWithoutZeroRegex,
    autoFocus: true,
    name: "name",
    md: 8,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 30,
  },
];
const header = "Expenses Category";
const subheader =
  "Here we add the list of available Expenses Category in the Entire System.";

class AddExpenseCategory extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
    };
    this.viewUrl = Actions.expenses_category.view.url;
  }

  postMethod = (category) => {
    let { year } = this.state;
    category.map((data) => {
      data["expense_for"] = 1;
    });
    let post_data = {
      academic_year: year,
      category,
    };
    this.setState({ submitDisable: true });
    let url = POST_URL.expensecategory.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.expenses_category.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };
  render() {
    const { submitDisable, note } = this.state;
    return (
      <div>
        <MultipleAdd
          fieldDetails={fieldDetails}
          header={header}
          subheader={subheader}
          name="Expenses Type"
          viewUrl={this.viewUrl}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          note={note}
          idFormat={"expense_type_2022_08_11_2_pm_"}
        />
      </div>
    );
  }
}

export default withRouter(AddExpenseCategory);
