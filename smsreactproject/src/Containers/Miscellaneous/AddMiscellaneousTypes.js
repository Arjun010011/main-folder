import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import MultipleAdd from 'Components/MultipleAdd'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.miscellaneousType} />,
        regex: nameAndNumberRegex, autoFocus: true, name: 'name', md: 6, maxLength: '50',
        className: 'width-100', required: true, id: 'outlined-textarea', default: '',
        rows: null, type: 'text'
    },
]

class AddMiscellaneousTypes extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false
        }
    }

    postMethod = (misc_types) => {
        this.setState({ submitDisable: true })
        let payload = { misc_types };
        let url = POST_URL.misctype.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.miscellaneous_type.view.url)
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
                    header={<FormattedMessage {...messages.miscellaneousType} />}
                    subheader={<FormattedMessage {...messages.addMiscellaneousTypeSubHeading} />}
                    name={Actions.miscellaneous_type.view.label}
                    viewUrl={Actions.miscellaneous_type.view.url}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    idFormat={'miscellaneous_add_2022_08_11_3_pm_'}
                />
            </div>
        )
    }
}

export default withRouter(AddMiscellaneousTypes)