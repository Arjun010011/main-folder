import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss'

const fieldDetails = [
    {
        label: 'Event Type', regex: nameAndNumberRegex, autoFocus: true, name: 'name', md: 6, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: '25',
    },
]
const header = 'Add Event Type'
const subheader = `The yearly schedule of the ${alias_names['school']} is defined here over a period time.The academic year over 12 months of time.`
const viewURL = '/dashboard/general/event-type/view'

class ManageEventType extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }
    }

    postMethod = (event_types) => {
        this.setState({ submitDisable: true })
        let postData = {
            event_types
        }
        let url = POST_URL.addEventType.api;
        postRequest(url, postData, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(viewURL)
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
                    name='Event Type'
                    viewURL={viewURL}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    idFormat={'events_add_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(ManageEventType)