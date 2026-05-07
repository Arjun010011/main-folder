import React, { Component } from 'react';
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import MultipleAdd from 'Components/MultipleAdd';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
  {
    label: 'Name',
    regex: nameAndNumberRegex,
    name: 'name',
    md: 6,
    maxLength: '225',
    className: 'width-100',
    required: true,
    id: 'outlined-textarea',
    default: '',
    rows: null,
    type: 'text',
    autoFocus: false,
  },
];

const note = 'Add advance fee type (e.g. Transport Advance, Book Advance).';

class AdvanceFeeTypeAdd extends Component {
  constructor(props) {
    super(props);
    this.state = { submitDisable: false };
  }

  postMethod = (data) => {
    this.setState({ submitDisable: true });
    // MultipleAdd passes an array of objects e.g. [{ name: "advance type 1" }, { name: "advance type 2" }]
    // Send the array as payload (no { name: ... } wrapper)
    const payload = Array.isArray(data) ? data : [data];
    const url = POST_URL.feeadvancetype?.api || 'finance/feeadvancetype/';
    postRequest(url, payload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: response.data?.Reason || 'Advance fee type added successfully.',
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.advance_fee_type?.view?.url || '/finance/advance-fee-type/list');
        } else {
          Swal.fire({ icon: 'error', title: response?.data?.Reason || 'Failed to add.' });
        }
        this.setState({ submitDisable: false });
      })
      .catch(() => {
        this.setState({ submitDisable: false });
        Swal.fire({ icon: 'error', title: 'Failed to add advance fee type.' });
      });
  };

  render() {
    const { submitDisable } = this.state;
    return (
      <div>
        <MultipleAdd
          fieldDetails={fieldDetails}
          header={Actions.advance_fee_type?.create?.label || 'Add Advance Fee Type'}
          name={Actions.advance_fee_type?.view?.label || 'Advance Fee Type'}
          viewUrl={Actions.advance_fee_type?.view?.url || '/finance/advance-fee-type/list'}
          submitDisable={submitDisable}
          postMethod={this.postMethod}
          note={note}
          idFormat="advancefeetype_"
        />
      </div>
    );
  }
}

export default withRouter(AdvanceFeeTypeAdd);
