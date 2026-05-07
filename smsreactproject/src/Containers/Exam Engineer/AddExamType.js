import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameRegex, nameAndNumberAndHyphenRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
    {
        label: 'Exam Name', regex: null, autoFocus: true, name: 'name', md: 6, className: 'width-80',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: '30'
    },
    {
        label: 'Exam Code', regex: null, autoFocus: false, name: 'code', md: 6, className: 'width-80',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: '10'
    },
]
const header = 'Exam Type'
const subheader = 'Here we add the list of available Exam types in the Entire System.'


class AddExamType extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false
        }
        this.viewUrl = Actions.exam_type.view.url
    }

    postMethod = (examtype) => {
        this.setState({ submitDisable: true })
        examtype.map((data) => {
            data['exam_type'] = 'Exam'
        })
        let url = POST_URL.examtypes.api;
        postRequest(url, examtype, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.exam_type.view.url)
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
                    name='Exam Type'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'exam_type_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(AddExamType)