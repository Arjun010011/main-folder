import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
 
const fieldDetails = [
    {
        label: <FormattedMessage {...messages.libCategoryTypeName} />,
        regex: nameWithQuoteRegex, autoFocus: false, name: 'name', md: 6, maxLength: '50',
        className: 'width-80', required: true, id: 'outlined-textarea', default: '',
        rows: null, type: 'text'
    },
]

class AddLibCategory extends Component {
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
        let url = POST_URL.librarycategory.api;
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
                    this.props.history.push(Actions.library_categegory.view.url)
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
                    header={<FormattedMessage {...messages.libCategoryType} />}
                    subheader={<FormattedMessage {...messages.addCategorySubHeading} />}
                    name={Actions.library_categegory.view.label}
                    viewUrl={Actions.library_categegory.view.url}
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

export default withRouter(AddLibCategory)