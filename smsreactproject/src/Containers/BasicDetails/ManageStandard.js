import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
    {
        label: 'Standard Name', regex: nameAndNumberRegex, name: 'name', md: 6, maxLength: '25', className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true,
    },
]
const header = 'Add Standard'
const subheader = 'The yearly schedule of the school is defined here over a period time.The academic year over 12 months of time.'
const note='Note: For Example (Standard 1/Class I)'

class ManageStandard extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }
        this.viewUrl = Actions.standards.view.url
    }

    postMethod = (standards) => {
        this.setState({ submitDisable: true })
        this.setState({ submitDisable: true })
        let payload = { standards };
        let url = POST_URL.standard.api;
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
                    this.props.history.push(Actions.standards.view.url)
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
                    name='Standard'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    note={note}
                    idFormat={'standard_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(ManageStandard)