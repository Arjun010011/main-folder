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
        label: 'Asset Name', regex: nameAndNumberRegex, name: 'name', md: 6, maxLength: '25', className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false,
    },
]
const header = 'Add Asset Type'
const note = 'Note: For Example (Chair)'


class AddAssetTypes extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }
        this.viewUrl = Actions.hostel_asset.view.url
    }

    postMethod = (asset_types) => {
        this.setState({ submitDisable: true })
        let url = POST_URL.asset.api;
        postRequest(url, asset_types, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.hostel_asset.view.url)
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
                    name='Asset Type'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    note={note}
                    idFormat={'asset_add_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(AddAssetTypes)