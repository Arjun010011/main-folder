import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import './styles.scss';
import LoadingGif from 'Components/LoadingGif';

const fieldDetails_global = [
    {
        label: 'Name', regex: nameWithQuoteRegex, autoFocus: false, name: 'name', md: 6, maxLength: '100', className: 'width-90',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text'
    },
]

const header = 'Additional Fee Type'
const subheader = 'This module is responsible for creating the different types of fees as per the institution’s requirement. Eg: Tution Fees, Online Fees ...';

class AdditionalFeeTypeAdd extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            loading: false,
            fieldDetails: null
        }
    }

    postMethod = (data_list) => {
        this.setState({ submitDisable: true })
        let payload = { data_list };
        let url = POST_URL.additionalchargetype.api;
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
                    this.props.history.push(Actions.additional_fee_type.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, loading } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails_global}
                    header={header}
                    subheader={subheader}
                    name='Additional Fee Type'
                    viewUrl={Actions.additional_fee_type.view.url}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    idFormat={'additional_fee_type_add_2022_08_11_2_pm_'}
                    requiredAllObject={true}
                />
            </div>
        )
    }
}

export default withRouter(AdditionalFeeTypeAdd)