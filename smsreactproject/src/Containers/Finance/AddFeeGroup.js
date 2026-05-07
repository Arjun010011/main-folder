import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameAndNumberAndHyphenRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import './styles.scss';

const fieldDetails = [
    {
        label: 'Fee Group', regex: nameAndNumberAndHyphenRegex, autoFocus: false, name: 'name', md: 6, maxLength: '25', className: 'width-100',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text'
    },
]

const header = 'Fee Group'
const subheader = 'This module is responsible for creating the different types of fees as per the school’s requirement. Eg: Tution Fees, Online Fees ...';

class AddFeeGroup extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }

    }

    postMethod = (groups) => {
        this.setState({ submitDisable: true })
        let payload = { groups };
        let url = POST_URL.feegroup.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.fee_group.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable } = this.state;
        return (
            <div>
               <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    subheader={subheader}
                    name='Fee Group'
                    viewUrl={Actions.fee_group.view.url}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    idFormat={'fee_group_add_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}

export default withRouter(AddFeeGroup)