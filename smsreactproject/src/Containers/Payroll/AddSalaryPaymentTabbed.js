import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Tabs, Tab, Box } from "@material-ui/core";
import classNames from "classnames";
import AddSalaryPaymentFormula from "./AddSalaryPaymentFormula";
import AddSalaryPayment from "./AddSalaryPayment";

class AddSalaryPaymentTabbed extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 0,
    };
  }

  handleTabChange = (event, newValue) => {
    this.setState({ activeTab: newValue });
  };

  render() {
    const { activeTab } = this.state;

    return (
      <div>
        <Box style={{ background: "#fff", paddingLeft: 16, paddingRight: 16 }}>
          <Tabs
            value={activeTab}
            onChange={this.handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="standard"
            style={{ borderBottom: "1px solid #e0e0e0" }}
          >
            <Tab label="Formula Based" />
            <Tab label="Manual Entry" />
          </Tabs>
        </Box>
        {activeTab === 0 && <AddSalaryPaymentFormula {...this.props} />}
        {activeTab === 1 && <AddSalaryPayment {...this.props} />}
      </div>
    );
  }
}

export default withRouter(AddSalaryPaymentTabbed);
