import React, { Component, Fragment } from 'react'
import { Paper, Box, TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Button } from '@material-ui/core';
import LoadingGif from 'Components/LoadingGif';
import { withRouter } from 'react-router-dom';

import { Forms } from 'Constants/FormDefinition';
import { Actions } from 'Constants/permissions';
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import { cloneDeep } from 'lodash';

class FormDefinition extends Component {
    constructor() {
        super()
        this.state = {
            loading: true,
            formdefinitions_list: [],
            update_forms: []
        }
    }

    componentDidMount = () => {
        const url = GET_URL.getformdefinitionslist.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    formdefinitions_list: response.data.data
                }, () => {
                    this.updateForms()
                })
            }
        })
    }

    updateForms = () => {
        let { formdefinitions_list } = this.state;
        let forms = cloneDeep(Forms)
        let temp_forms = []
        let temp = { page_details: {} }
        let exisiting = false
        formdefinitions_list.map((data) => {
            exisiting = false
            forms.map((form_data) => {
                if (form_data.page_details.form_name === data.form_name) {
                    exisiting = true
                }
            })
            if (!exisiting) {
                temp = {}
                temp['page_details'] = {}
                temp['page_details']['form_name'] = data['form_name']
                temp['page_details']['form_label'] = data['form_name']
                temp['page_details']['new_form'] = true
                temp_forms.push(temp)
            }
        })
        temp_forms = [...forms, ...temp_forms]
        this.setState({
            update_forms: temp_forms,
            loading: false
        })
    }

    handleEditPage = (field) => {
        let form_name = field['page_details']['form_name']
        let form_label = field['page_details']['form_label']
        let formInformation = {
            form_name: form_name,
            form_label: form_label,
        }
        if(field['page_details']['new_form']){
            formInformation['new_form']=field['page_details']['new_form']
        }
        let searchParam = "?" + new URLSearchParams(formInformation).toString()
        this.props.history.push({
            pathname: Actions.form_definition.update.url,
            search: searchParam,
        });
    }

    render() {
        let { loading, update_forms } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Box className='heading header-align'>
                        Form Definition Page List
                    </Box>
                    <Paper className='paper-plan-background'>
                        <TableContainer>
                            <Table size='large' aria-label='simple table'>
                                <TableHead>
                                    <TableRow className=''>
                                        {/* <TableCell className=''>Request Type</TableCell> */}
                                        <TableCell className=''>Form Name</TableCell>
                                        <TableCell className=''> Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {update_forms.map((field) => {
                                        return (
                                            <TableRow className=''>
                                                {/* <TableCell className='' component='th' scope='row'>
                                                    {field['page_details']['request_type']}
                                                </TableCell> */}
                                                <TableCell className=''>
                                                    {field['page_details']['form_label']}

                                                </TableCell>
                                                <TableCell className='' component='th' scope='row'>
                                                    <Button onClick={() => this.handleEditPage(field)}>
                                                        Edit
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Paper>
            )
        }
    }
}

export default withRouter(FormDefinition)