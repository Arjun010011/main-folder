import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { numberRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';

const header = 'Denominations Setup'


class AddDenomination extends Component {

    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            fieldDetails: [
                {
                    label: 'Denomination Amount (e.g. 500, 200, 100)', regex: numberRegex, name: 'amount', md: 6, maxLength: '10', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: false
                }
            ],
        }
        this.viewUrl = Actions.denominations.view.url
    }

    postMethod = (denomination_details) => {
        this.setState({ submitDisable: true })
        denomination_details.forEach((data) => {
            data.amount = parseInt(data.amount)
            data.is_active = true // default to active when adding
        })

        let url = POST_URL.denominations.api;
        postRequest(url, denomination_details, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.denominations.view.url)
                }
                this.setState({ submitDisable: false })
            })
            .catch(() => {
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, fieldDetails } = this.state
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    name='Denominations'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'denomination_add_'}
                />
            </div>
        )
    }
}

export default withRouter(AddDenomination)
