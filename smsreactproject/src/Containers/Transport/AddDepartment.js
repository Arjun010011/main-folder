import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
    {
        label: 'Department Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 6, className: 'width-100',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30
    },
]
const header = 'Add Department'
const subheader = 'Here we add the list of available Department in the Entire System.'


class AddDepartment extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
        }
        this.viewUrl = Actions.transport_department.view.url
    }

    postMethod = (departments) => {
        let { year } = this.state;
        let post_data = {
            departments: departments
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.department.api;
        postRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.transport_department.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }
    render() {
        const { submitDisable, note } = this.state
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    subheader={subheader}
                    name='Add Department'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    note={note}
                    idFormat={'department_add_2022_08_11_3_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(AddDepartment)
