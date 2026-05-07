import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog, TextField } from '@material-ui/core';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Typography from '@material-ui/core/Typography';
import WarningIcon from '@material-ui/icons/Warning';
import { NumberFormatCustom, numberWithCommas } from 'Includes/functions';
import { DropDownWithSearchAndAddApi } from 'Components/DropDownWithSearchAndAddApi';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
// import './styles.scss';
import { nameAndNumberAndHyphenRegex } from 'Constants/regularExpression'
import { minDate, reasonType } from 'Constants';
import { POST_URL, GET_URL } from 'Includes/urls'
import { getRequest } from 'Includes/api/apicall';
import Skeleton from '@material-ui/lab/Skeleton';

const fieldDetails = [
    {
        label: 'Reason Name', regex: nameAndNumberAndHyphenRegex, autoFocus: false, name: 'name', md: 12, className: 'w-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50, gridClassName: "margin-vertical-20",
    },
]

const styles = (theme) => ({
    root: {
        margin: 0,
        padding: theme.spacing(2),
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
    },
});

const DialogTitle = withStyles(styles)((props) => {
    const { children, classes, onClose, ...other } = props;
    return (
        <MuiDialogTitle disableTypography className={classes.root} {...other}>
            <Typography variant="h6">{children}</Typography>
            {onClose ? (
                <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            ) : null}
        </MuiDialogTitle>
    );
});

const DialogContent = withStyles((theme) => ({
    root: {
        padding: theme.spacing(2),
    },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
    root: {
        margin: 0,
        padding: theme.spacing(1),
    },
}))(MuiDialogActions);

const header = 'Add Discount';


const body = '';

export default function FeeCollectionDiscount(props) {
    const [open, setOpen] = React.useState(true);
    const [body, setBody] = React.useState([]);
    const [reasonForAdjustment, setreasonForAdjustment] = React.useState('');
    const [discount, setDiscount] = React.useState('');
    const [fieldError, setFieldError] = React.useState({});
    const [alertData, setAlertData] = React.useState('')
    const [snackbar, setSnackbar] = React.useState(false)
    const [reasonList, setReasonList] = React.useState([])
    const [reasonForAdjustmentError, setreasonForAdjustmentError] = React.useState(false)
    const [reasonLoading, setReasonLoading] = React.useState(false)

    const handleClose = () => {
        props.closeInParent();
    };

    const handleCloseSnackBar = () => {
        setSnackbar(false)
    }

    const saveAdjustment = () => {
        if (validate()) {
            let data = { 'reason_id': reasonForAdjustment, 'amount': discount };
            props.saveAdjustment(data);
        }
    }

    const getReasonList = () => {
        setReasonLoading(() => true)
        const url = GET_URL.reason.api
        const params = { is_active: true, reason_type: reasonType['adjustment'] }
        getRequest(url, params, props).then(response => {
            if (response && response.status === 200) {
                let reasonList=[]
                response.data.data.map((data)=>{
                    if(!props.discount_ids.includes(data.id)){
                        reasonList.push(data)
                    }
                })
                setReasonList(() => reasonList)
            }
            setReasonLoading(() => false)
        })
    }

    const validate = () => {
        let return_value = true
        if (!Boolean(reasonForAdjustment)) {
            setAlertData('Please provide the reason')
            setreasonForAdjustmentError(true)
            return_value = false
        }
        if (!discount || discount <= 0) {
            let fieldError = { discount: 'Enter amount' }
            setFieldError(() => fieldError)
            return_value = false
        }
        return return_value
    }

    const handleDropDown = (e, newValue) => {
        setreasonForAdjustment(newValue)
        setreasonForAdjustmentError(() => '')
    }

    const updatePostFormat = (newData) => {
        newData.name = newData.name
        newData.reason_type = reasonType['adjustment']
        let payload = {
            reason: [newData]
        }
        return payload
    }

    const updateType = (field) => {
        setReasonLoading(() => true)
        let temp_list = [...reasonList]
        temp_list.push(field)
        setReasonList(() => temp_list)
        setReasonLoading(() => false)
        return true
    }

    React.useEffect(() => {
        setOpen(props.showModal)
        setBody(props.body)
        getReasonList()
    }, [props.showModal]);

    const handleSearchChange = (e) => {
        const { value } = e.target;
        if (value <= parseFloat(props.totalAmountPaid) - parseFloat(props.total_discount)) {
            setDiscount(() => value)
            let fieldError = {}
            setFieldError(() => fieldError)
        }
    }

    return (
        <div>
            <Dialog
                // onClose={handleClose}
                className='action-basic-detail-width'
                aria-labelledby="customized-dialog-title" open={open}>
                <DialogTitle id="customized-dialog-title" onClose={handleClose}>
                    {header}
                    <Box className="warning-msg">
                        <Box display="flex" className='warning-message fs-12' mt={2} ml={0}>
                            <WarningIcon style={{ color: '#f6c342' }} /> Discount Amount will reduce the student fees. Please review before submit
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>

                    {/* <TextareaAutosize aria-label="minimum height" style={reasonForAdjustmentError ? {'borderColor': 'red'} : {}} className='w-100 adjustment-textarea' 
                        rowsMin={4} placeholder="Reason For Adjustment *" maxLength={200}
                        onChange={handleDropDown} onBlur={validate} value={reasonForAdjustment} 
                    /> */}
                    <div className=''>
                        {reasonLoading ?
                            <div>
                                <Skeleton variant="rect" className='drop-down-skeleton m-t-10px'></Skeleton>
                                <div>...Loading Reason List</div>
                            </div>
                            :
                            <div className=''>
                                <DropDownWithSearchAndAddApi
                                    options={reasonList}
                                    value={reasonForAdjustment}
                                    onChange={(e, newValue) => handleDropDown(e, newValue)}
                                    name='reason'
                                    label='Reason Name *'
                                    optionValue='name'
                                    className='width-100-perc'
                                    helperText={reasonForAdjustmentError && reasonForAdjustmentError}
                                    error={reasonForAdjustmentError && reasonForAdjustmentError}
                                    fieldDetails={fieldDetails}
                                    postUrl={POST_URL.reason.api}
                                    updatePostFormat={updatePostFormat}
                                    updateType={updateType}
                                    hideClearIcon
                                    showAddNew={true}
                                />
                                <TextField
                                    autoComplete='off'
                                    InputProps={{
                                        inputComponent: NumberFormatCustom,
                                    }}
                                    label={'Amount'}
                                    name={'discount'}
                                    className='width-100'
                                    value={discount}
                                    variant='outlined'
                                    inputProps={{ maxLength: 8, style: { textAlign: 'right' } }}
                                    helperText={`Maximum discount is ${numberWithCommas(parseFloat(props.totalAmountPaid) - parseFloat(props.total_discount))}`}
                                    error={fieldError['discount'] && fieldError['discount']}
                                    onChange={(e) => handleSearchChange(e)}
                                />
                            </div>
                        }
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={saveAdjustment} color="primary" disabled={props.saveButtonBlocked}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={snackbar}
                autoHideDuration={10000}
                onClose={handleCloseSnackBar}
            >
                <Alert onClose={handleCloseSnackBar} severity="error">
                    {alertData}
                </Alert>
            </Snackbar>
        </div>
    );
}