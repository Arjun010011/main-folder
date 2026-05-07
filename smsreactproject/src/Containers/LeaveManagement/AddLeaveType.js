import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameRegex, nameAndNumberRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
    { label: 'Leave Name', regex: nameRegex, autoFocus: false, name: 'name', md: 6, className: 'width-80', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
    { label: 'Leave Code', regex: nameAndNumberRegex, autoFocus: false, name: 'code', md: 6, className: 'width-80', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
]
const header = 'Add Leave Type'
const subheader = 'Here we add the list of available Leave types in the Entire System.'


class AddLeaveType extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }
        this.viewUrl = Actions.manage_leave_types.view.url
    }

    postMethod = (leaveType) => {
        this.setState({ submitDisable: true })
        let url = POST_URL.leavetype.api;
        postRequest(url, leaveType, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.manage_leave_types.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }
    render() {
        const { submitDisable } = this.state
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    subheader={subheader}
                    name='Leave Type'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'leave_type_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(AddLeaveType)