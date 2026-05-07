import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameRegex, nameAndNumberRegex, nameAndNumberWithSpecialCharacterRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.storeCategoryTypeName} />,
        regex: nameAndNumberWithSpecialCharacterRegex  , autoFocus: false, name: 'name', md: 6, maxLength: '50',
        className: 'width-80', required: true, id: 'outlined-textarea', default: '',
        rows: null, type: 'text'
    },
    {
        label: <FormattedMessage {...messages.storeCategoryTypeCode} />,
        regex: nameAndNumberWithSpecialCharacterRegex , autoFocus: false, name: 'code', md: 6, maxLength: '50',
        className: 'width-80', required: true, id: 'outlined-textarea', default: '',
        rows: null, type: 'text'
    },
]

class AddCategory extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false
        }
    }

    postMethod = (categoryType) => {
        let post_data = {
            'category': categoryType
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.storecategory.api;
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
                    this.props.history.push(Actions.store_inventory_category.view.url)
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
                    header={<FormattedMessage {...messages.storeCategoryType} />}
                    subheader={<FormattedMessage {...messages.addCategorySubHeading} />}
                    name={Actions.store_inventory_category.view.label}
                    viewUrl={Actions.store_inventory_category.view.url}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                    idFormat={'category_add_2022_08_11_3_pm_'}
                />
            </div>
        )
    }
}

export default withRouter(AddCategory)