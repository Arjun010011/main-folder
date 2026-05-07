import React, { Component } from 'react'
import { Grid, FormLabel, Box, Button, Divider } from '@material-ui/core';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import { Dropdown } from 'Components/DropDown';



const fieldDetails_global = [
    {
        label: '', regex: null, name: '', md: 8, className: 'width-form-90', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'drop_down', maxLength: 25
    },
]

export default class SetupPage extends Component {

    constructor(props) {
        super(props)

        this.state = {
            fieldDetails: null,
            fieldValue: { label: '' },
            entryValues: []
        }
    }


    getList = async (fieldValue, params) => {
        const url = fieldValue.url
        let param = {}
        params.map((data) => {
            param[data.key] = data['value']
        })
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    dataList: response.data.data,
                    loading: false,
                    fieldValue: fieldValue
                }, () => {
                    this.updateFieldDetails();
                })
            }
        })
    }

    updateFieldDetails = () => {
        const { dataList, fieldValue } = this.state;
        let fieldDetail = [...fieldDetails_global];
        fieldDetail.map((field) => {
            field['list'] = dataList
            field['label'] = fieldValue['label']
            field['name'] = fieldValue['name']
        })
        this.setState({
            fieldDetails: fieldDetail
        })
    }

    updateParent = (value) => {
        let { entryValues } = this.state
        entryValues = value
        this.setState({
            entryValues,
        })
    }


    render() {
        const { fieldDetails, fieldValue } = this.state;
        return (
            <Box>
                <Box className='form-left-heading'>
                    Setup Page for {fieldValue.label}
                </Box>
                {fieldDetails &&
                    <Grid container className='custom-menu-height'>
                        <Grid item md={4}>
                            <MultipleAddTextFields
                                fieldDefaultValue={[]}
                                fieldDetails={fieldDetails}
                                updateParent={this.updateParent}
                                ref={'child'}
                                idFormat={'setup_page_2022_08_11_3_pm_'}
                            />
                            <Box className='end-flex-prop  margin-top-30'>
                                <Box>
                                    <Button variant="contained" color="primary"
                                        className='submit'
                                        disabled={this.state.submitDisable}
                                        onClick={this.submit}>
                                        Submit
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                }

            </Box>
        )
    }
}
