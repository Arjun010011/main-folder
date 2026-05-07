import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameAndNumberRegex, nameRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const fieldDetails = [
    {
        label: 'Country Name', regex: nameRegex, autoFocus: true, name: 'name', md: 6, className: 'width-80', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30
    },
    {
        label: 'Code', regex: nameAndNumberRegex, autoFocus: false, name: 'code', md: 6, className: 'width-80', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 20
    },
]
const header = 'Add Country '
const subheader = `The yearly schedule of the ${alias_names['school']} is defined here over a period time.The academic year over 12 months of time.`


class ManageCountries extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }
        this.viewUrl = Actions.manage_countries.view.url
    }

    postMethod = (countries) => {
        let post_data = {
            'countries': countries
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.country.api;
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
                    this.props.history.push(Actions.manage_countries.view.url)
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
                    name='Country'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    idFormat={'country_add_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(ManageCountries)