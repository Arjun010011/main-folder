import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import {
    Dialog, DialogContent, DialogActions, DialogTitle, Divider,
    Radio, RadioGroup, FormControlLabel, FormControl, Button
} from '@material-ui/core';
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import Swal from 'sweetalert2';
import Card from '@material-ui/core/Card';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';



const styles = theme => ({
})


class AssignVehicleModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedVan: "",
            openSnackbar: false,
            errorStatus: 'error',
            alertData:''
        };
    }

    handleClose = () => {
        this.setDefaultvalue();
        this.props.closeModal();
    }

    setDefaultvalue = () => {
        this.setState({
            selectedVan: '',
        })
    }

    handleChange = (event) => {
        const { value } = event.target;
        let { selectedVan } = this.state;
        selectedVan = value;
        this.setState({ selectedVan });
    }

    assignDriverToVan = () => {
        let { staff_id } = this.props;
        let { selectedVan } = this.state
        if( !!selectedVan ){
            let payload = { 'vehicle' : selectedVan, 'driver': this.props.selectedStaff['staff_id']}
            let url = POST_URL.vehicledriver.api;
            let props = { ...this.props };
            props.return_error = true;
            postRequest(url, payload, props).then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.handleClose()
                }else{
                    let errorMsg = 'Something went wrong'
                    if( !!response.data[0] ){
                        errorMsg = response.data[0]
                    }
                    this.setState({
                        disableSubmit: false,
                        openSnackbar: true,
                        alertData: errorMsg
                    });
                }
            });
        }else{
            this.setState({
                openSnackbar: true,
                alertData: 'Please select the Van'
            })
        }
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false 
        })
    }

    render() {
        const { fieldDetails, selectedStaff, showModal } = this.props;
        const { selectedVan, errorStatus, openSnackbar, alertData} = this.state;
        const { handleClose, assignDriverToVan } = this;
        return (
            <Dialog
                open={showModal}
                onClose={() => this.handleClose()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                maxWidth="sm"
                fullWidth={true}
            >
            {showModal &&
                <>
                <DialogTitle style={{ textAlign: "center" }}>
                    Select Van
                        <div className="select-van-staff-name">For - { selectedStaff.full_name }</div> 
                </DialogTitle>
                <Divider />
                <DialogContent style={{padding: '0px'}}>
                    <FormControl component="fieldset" className="width-100 align-items-center">
                        <RadioGroup value={parseInt(selectedVan)} onChange={(e) => this.handleChange(e)}>
                            {fieldDetails.map((field, index) => {
                                return <Card className="card-vehicle-details display-flex" md="6" key={index}> 
                                            <FormControlLabel
                                                key={index}
                                                value={field.id}
                                                control={<Radio color="primary" />}
                                                style={{width: '40px'}}
                                            />
                                            <div className="">
                                                <b> Vehicle Name : </b> {field.name} {' '} <br/ >
                                                <b> Vehicle Number : </b> {field.vehicle_num} {' '} <br />
                                                <b> Vehicle Code : </b> {field.vehicle_code}
                                            </div>
                                        </Card>
                            })}
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color='secondary'>
                        Close
                    </Button>
                    <Button  onClick={() => assignDriverToVan()} color='primary'>
                        Assign Van
                    </Button>
                </DialogActions>
                </>
            }
            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
                <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity={errorStatus}>
                    {alertData}
                </Alert>
            </Snackbar>
            </Dialog>
        );
    }

}
export default withStyles(styles)(AssignVehicleModal)