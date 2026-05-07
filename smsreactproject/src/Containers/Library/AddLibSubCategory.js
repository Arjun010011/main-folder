import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import MultipleAdd from "Components/MultipleAdd";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import messages from "./messages";
import { getUrlParam } from "Includes/functions";

const fieldDetails = [
  {
    label: <FormattedMessage {...messages.libSubCategoryTypeName} />,
    regex: nameWithQuoteRegex,
    autoFocus: false,
    name: "name",
    md: 6,
    maxLength: "50",
    className: "width-80",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
  },
];

class AddLibSubCategory extends Component {
  constructor(props) {
    super(props);
    this.state = {
      submitDisable: false,
    };
  }

  componentDidMount() {
    let { categoryType, selectedCategory } = getUrlParam();
    this.setState({
      category: categoryType,
      categoryId: selectedCategory,
    });
  }

  postMethod = (subCategory) => {
    this.setState({ submitDisable: true });
    let url = POST_URL.librarysubcategory.api;
    let post_data = {
      category: this.state.categoryId,
      sub_category: subCategory,
    };
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.viewUrl();
      }
      this.setState({ submitDisable: false });
    });
  };

  viewUrl = () => {
    let searchState = {
      category: this.state.category,
      categoryId: this.state.categoryId,
    };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.library_sub_categegory.view.url,
      search: searchParam,
    });
  };

  render() {
    const { submitDisable, category } = this.state;
    return (
      <div>
        <MultipleAdd
          fieldDetails={fieldDetails}
          header={
            <FormattedMessage
              {...messages.libSubCategoryType}
              values={category}
            />
          }
          subheader={
            <FormattedMessage {...messages.addSubCategorySubHeading} />
          }
          name={Actions.library_sub_categegory.view.label}
          viewUrl={Actions.library_sub_categegory.view.url}
          viewParams={{ categoryId: this.state.categoryId }}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
          buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
          bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
          idFormat={"sub_caterogy_add_2022_08_11_3_pm_"}
        />
      </div>
    );
  }
}

export default withRouter(AddLibSubCategory);
