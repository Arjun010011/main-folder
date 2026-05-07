import React, { Component } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, Grid } from '@material-ui/core';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';

import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';
import Swal from 'sweetalert2';

export default class ModifyPrevStandard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            open: false,
            submitDisable: false,
            selectedPrevStandard: [],
            error: {},
            strengthList: [],
            updateStrength: []
        }
    }

    componentDidMount = () => {
        const { year } = this.props;
        this.getStrengthList(year);
    }


    getStrengthList = (id) => {
        const { strengthData } = this.props;
        let { selectedPrevStandard } = this.state
        let strength = []
        const url = GET_URL.getstandard.api
        let param = { academic_year: id, prev_standard: true, is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let strengthList = response.data.data;
                strengthData.map((data, index) => {
                    let temp = { 'standard_section': [] }
                    temp['standard'] = data.standard
                    temp['standardName'] = data.standard__name
                    selectedPrevStandard[index] = data.prev_standard
                    temp['prev_standard'] = data.prev_standard
                    data.section.map((sectionData, index) => {
                        temp['standard_section'][index] = sectionData.id
                    })
                    strengthList.map((data) => {
                        if (data.id === temp.standard) {
                            data.prev_standard = temp.prev_standard;
                        }
                    })
                    strength.push(temp)
                })
                this.setState({
                    standardList: response.data.prev_standard,
                    selectedPrevStandard,
                    updateStrength: strength,
                    strengthList,
                    errorContent: ''
                })
            }
        })
    }

    handleOpen = () => {
        this.setState({
            open: true,
            errorContent: ''
        })
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    onChange = (e, index, standard) => {
        let { value } = e.target;
        let { updateStrength, error, errorContent } = this.state;
        if (value !== 0) {
            if (standard === value) {
                errorContent = 'Previous Year Standard and Current Standard Should not be same'
                this.setState({
                    errorContent
                })
            }
            else {
                error = {}
                errorContent = ''
                updateStrength[index]['prev_standard'] = value
                this.setState({
                    updateStrength,
                    error,
                    errorContent
                })
            }
        }

    }

    update = () => {
        let { updateStrength, error, errorContent } = this.state;
        if ((Object.keys(error).length === 0)) {
            const put_url = POST_URL.strengthupdate.api
            let props = { ...this.props };
            props['return_error'] = true
            postRequest(put_url, updateStrength, props).then(response => {
                if (response && response.status === 200) {
                    this.handleClose();
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                }
                else if (response && response.status === 400) {
                    this.setState({
                        errorContent: response.data.strength[0],
                    })
                }
            })
        }
        else {
            errorContent = 'Please Clear The Errors'
            this.setState({
                errorContent
            })
        }
    }

    render() {
        const { open, submitDisable, standardList, error, updateStrength, errorContent } = this.state;
        const { baseClassName } = this.props;
        return (
            <div>
                <Button
                    variant="contained"
                    onClick={this.handleOpen}
                    className='editbutton-view'
                ><EditOutlinedIcon className='visibility-icon' /> Modify Previous Standard</Button>
                <Dialog open={open}
                    className={baseClassName}
                    // onClose={this.handleClose} 
                    aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText className='text-center'>
                            Please Update Previous Year Standard
                        </DialogContentText>
                        {updateStrength.map((data, index) => {
                            return (
                                <Grid container className='margin-top-20'>
                                    <Grid item md={6}>
                                        <Dropdown
                                            data={standardList}
                                            name='selectedPrevStandard'
                                            value={data.prev_standard}
                                            onChange={(e) => this.onChange(e, index, data.standard)}
                                            label='Previous Year'
                                            error={error[`prev_standard${index}`]}
                                        />
                                    </Grid>
                                    <Grid item md={6}>
                                        <Box className='modify-standard-name'>
                                            {data.standardName}
                                        </Box>
                                    </Grid>
                                </Grid>
                            )
                        })}
                        <Box className='error-content flex-justify-center margin-top-10'>
                            {errorContent}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleClose} color="secondary">
                            Close
                        </Button>
                        <Button
                            onClick={e => this.update(e)}
                            disabled={submitDisable}
                            color="primary">
                            Submit
                    </Button>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}
