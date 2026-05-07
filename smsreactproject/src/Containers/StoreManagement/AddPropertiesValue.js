import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

import MultipleAdd from 'Components/MultipleAdd'
import { nameAndNumberAndHyphenRegex, nameRegex, nameAndNumberWithSpecialCharacterRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import messages from './messages';
import { getUrlParam } from 'Includes/functions';

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.storePropertyValue} />,
        regex: nameAndNumberWithSpecialCharacterRegex , autoFocus: true, name: 'name', md: 6, maxLength: '50',
        className: 'width-100', required: true, id: 'outlined-textarea', default: '',
        rows: null, type: 'text'
    },
]

class AddPropertyValue extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false
        }
    }

    componentDidMount() {
        let { propertyName, selectedProperty } = getUrlParam()
        this.setState({
            propertyName: propertyName,
            propertyId: selectedProperty,
        })
    }

    postMethod = (propertyValue) => {
        this.setState({ submitDisable: true })
        let url = POST_URL.propertyvalue.api;
        let post_data = {
            "properties": this.state.propertyId,
            "values": propertyValue,
        }
        postRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.viewUrl()
                }
                this.setState({ submitDisable: false })
            });
    }


    viewUrl = () => {
        let searchState = { propertyName: this.state.propertyName, propertyId: this.state.propertyId }
        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.store_inventory_properties_values.view.url,
            search: searchParam,
        });
    }

    render() {
        const { submitDisable } = this.state;
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={<FormattedMessage {...messages.addPropertyValueHeading} />}
                    subheader={<FormattedMessage {...messages.addPropertyValueSubHeading} />}
                    name={Actions.store_inventory_properties_values.view.label}
                    viewUrl={Actions.store_inventory_properties_values.view.url}
                    viewParams={{ propertyId: this.state.propertyId }}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    idFormat={'property_value_add_2022_08_11_3_pm_'}
                />
            </div>
        )
    }
}

export default withRouter(AddPropertyValue)